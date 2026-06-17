// CaddiePose — Apple Vision pose detection bridge
//
// One-file Objective-C native module exposed to React Native via
// `NativeModules.CaddiePose`. Three methods:
//
//   initialize()                     -> resolves true when body-pose is
//                                       actually usable on this runtime
//   detectOnImage(imagePath)         -> resolves [{name,x,y,z,visibility}, ...]
//   detectOnVideoFrame(path, timeMs) -> resolves {width,height,landmarks:[...]}
//
// Y is flipped on emit so (0,0) is top-left, matching our SVG /
// DrawingCanvas coordinate convention. The Z dimension is padded
// with 0 because VNDetectHumanBodyPoseRequest is 2D — the
// downstream `PoseLandmark` type carries Z for forward compatibility
// with a 3D engine (Phase 3.x may revisit).
//
// `initialize` runs a tiny capability probe rather than just checking
// the OS version: VNDetectHumanBodyPoseRequest cannot be *set up* on
// the iOS Simulator (the body-pose model isn't in the simulator
// runtime) and fails with Vision error code 9. Probing here means
// unsupported runtimes report failure so the UI hides the pose feature
// (PROJECT_SPEC §22 Phase 3.1: "failure disables pose features without
// crash") instead of showing a toggle that can never work. On a real
// device the probe also pre-warms the model.
//
// `detectOnVideoFrame` (Phase 3.2) grabs the exact frame from the
// recorded video via AVAssetImageGenerator rather than a screen
// snapshot: react-native-view-shot can't capture the AVPlayerLayer's
// pixels on iOS (it comes back black). It uses the *async* generator
// because library videos are remote signed URLs — the synchronous
// copyCGImageAtTime: doesn't wait for a remote asset to load and
// returns nil. The generator applies the preferred track transform so
// the CGImage is upright; the returned width/height describe that
// upright image so the JS overlay can map the normalised landmarks
// into the letterboxed video rect without guessing display orientation.
//
// Detection runs on a serial background queue so the JS thread stays
// responsive even when the model is busy.
//
// Spec: PROJECT_SPEC.md §22 Phase 3.1 / 3.2. §16 Risk 4 explicitly
// contemplates a direct native bridge as the fallback when the
// community `react-native-mediapipe` package isn't viable —
// `react-native-mediapipe@0.6.0` is incompatible with Vision Camera
// 5 (header rename) so we're taking that path with Apple Vision
// instead of MediaPipe. Apple's 19-landmark schema covers every
// joint needed for the spec's §22 Phase 3.3 metrics (shoulders,
// hips, spine, head).

#import <React/RCTBridgeModule.h>
#import <Vision/Vision.h>
#import <CoreImage/CoreImage.h>
#import <AVFoundation/AVFoundation.h>
#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

@interface CaddiePose : NSObject <RCTBridgeModule>
@end

@interface CaddiePose ()
// Holds the in-flight batch generator alive for the duration of
// detectPosesForVideo's async extraction (the method returns before the
// callbacks finish, so without a strong ref ARC would deallocate it and
// stop generation).
@property (nonatomic, strong) AVAssetImageGenerator *activeBatchGenerator;
// Same lifetime hack for extractJpegFrames' async generation (Phase 4.2).
@property (nonatomic, strong) AVAssetImageGenerator *activeFrameGenerator;
@end

@implementation CaddiePose

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (dispatch_queue_t)methodQueue {
  // Serial background queue. Detection is CPU/GPU bound; keeping
  // calls on a dedicated queue avoids JS-thread starvation.
  static dispatch_once_t once;
  static dispatch_queue_t queue;
  dispatch_once(&once, ^{
    queue = dispatch_queue_create("caddie.pose.detect", DISPATCH_QUEUE_SERIAL);
  });
  return queue;
}

// Shared Vision pass: CIImage -> array of landmark dictionaries.
// Returns an empty array when no body is detected (not an error);
// returns nil and sets *error on a genuine Vision failure (including
// the simulator's "Unable to setup request" — Vision error code 9).
- (NSArray *)landmarksFromCIImage:(CIImage *)image
                            error:(NSError **)error API_AVAILABLE(ios(14.0)) {
  VNDetectHumanBodyPoseRequest *request =
      [[VNDetectHumanBodyPoseRequest alloc] init];
  VNImageRequestHandler *handler =
      [[VNImageRequestHandler alloc] initWithCIImage:image options:@{}];

  NSError *requestError = nil;
  BOOL ok = [handler performRequests:@[request] error:&requestError];
  if (!ok || requestError) {
    if (error) {
      *error = requestError
          ?: [NSError errorWithDomain:@"caddie.pose"
                                 code:1
                             userInfo:@{NSLocalizedDescriptionKey: @"perform failed"}];
    }
    return nil;
  }

  VNHumanBodyPoseObservation *observation =
      (VNHumanBodyPoseObservation *)request.results.firstObject;
  if (!observation) {
    // No body detected — empty array, not an error.
    return @[];
  }

  NSError *pointsError = nil;
  NSDictionary<VNHumanBodyPoseObservationJointName, VNRecognizedPoint *> *points =
      [observation recognizedPointsForGroupKey:VNHumanBodyPoseObservationJointsGroupNameAll
                                          error:&pointsError];
  if (pointsError) {
    if (error) {
      *error = pointsError;
    }
    return nil;
  }

  NSMutableArray *landmarks = [NSMutableArray arrayWithCapacity:points.count];
  [points enumerateKeysAndObjectsUsingBlock:
      ^(VNHumanBodyPoseObservationJointName key,
        VNRecognizedPoint *point,
        BOOL * _Nonnull stop) {
    [landmarks addObject:@{
      @"name": key,
      @"x": @(point.location.x),
      // Vision normalises with Y bottom-up; flip so y=0 is top
      // (matches our SVG / DrawingCanvas coordinate convention).
      @"y": @(1.0 - point.location.y),
      @"z": @0,
      @"visibility": @(point.confidence)
    }];
  }];

  return landmarks;
}

// Cached AVAssetImageGenerator keyed by URL. Building the asset is the
// expensive part for a remote video (the original code rebuilt it on
// every scrub, so each frame re-loaded the asset — that was the bulk of
// the "5+ seconds" lag). Reusing a single warm generator per URL makes
// every frame after the first fast. Only ever touched from the serial
// methodQueue, so the dictionary needs no locking.
- (AVAssetImageGenerator *)generatorForURL:(NSURL *)url {
  static NSMutableDictionary<NSString *, AVAssetImageGenerator *> *cache;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    cache = [NSMutableDictionary dictionary];
  });

  NSString *key = url.absoluteString ?: @"";
  AVAssetImageGenerator *cached = cache[key];
  if (cached) {
    return cached;
  }

  AVURLAsset *asset = [AVURLAsset URLAssetWithURL:url options:nil];
  AVAssetImageGenerator *generator =
      [AVAssetImageGenerator assetImageGeneratorWithAsset:asset];
  // Upright frame so it lines up with how react-native-video shows it.
  generator.appliesPreferredTrackTransform = YES;
  // Vision doesn't need full resolution — cap the long side so decode +
  // inference stay cheap without hurting joint accuracy.
  generator.maximumSize = CGSizeMake(1280, 1280);
  // Small tolerance keeps scrubbing responsive (≤~1 frame off is
  // imperceptible for a skeleton overlay).
  CMTime tolerance = CMTimeMakeWithSeconds(0.1, 600);
  generator.requestedTimeToleranceBefore = tolerance;
  generator.requestedTimeToleranceAfter = tolerance;

  cache[key] = generator;
  return generator;
}

// Local copy of a (possibly remote) video, cached by URL. Batch frame
// extraction needs the file local — seeking a remote asset hundreds of
// times would take minutes. File URLs pass through untouched; remote
// URLs are downloaded once to a temp file. Returns nil + sets *error on
// failure. Runs on the serial methodQueue, so the cache needs no lock.
- (NSURL *)localURLForVideo:(NSURL *)url error:(NSError **)error {
  if (url.isFileURL) {
    return url;
  }

  static NSMutableDictionary<NSString *, NSURL *> *cache;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    cache = [NSMutableDictionary dictionary];
  });

  NSString *key = url.absoluteString ?: @"";
  NSURL *cached = cache[key];
  if (cached &&
      [[NSFileManager defaultManager] fileExistsAtPath:cached.path]) {
    return cached;
  }

  NSData *data = [NSData dataWithContentsOfURL:url options:0 error:error];
  if (!data) {
    return nil;
  }

  NSString *fileName =
      [[NSUUID UUID].UUIDString stringByAppendingPathExtension:@"mp4"];
  NSURL *dest = [[NSURL fileURLWithPath:NSTemporaryDirectory()]
      URLByAppendingPathComponent:fileName];
  if (![data writeToURL:dest options:NSDataWritingAtomic error:error]) {
    return nil;
  }

  cache[key] = dest;
  return dest;
}

RCT_EXPORT_METHOD(initialize:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  if (@available(iOS 14.0, *)) {
    // Capability probe — see the file header. Run the request on a tiny
    // throwaway image; if Vision can't even set it up (the Simulator),
    // report the engine as unavailable so the pose UI stays hidden.
    CIImage *probe = [[CIImage imageWithColor:
                          [CIColor colorWithRed:0.5 green:0.5 blue:0.5]]
        imageByCroppingToRect:CGRectMake(0, 0, 64, 64)];
    NSError *probeError = nil;
    NSArray *probeResult = [self landmarksFromCIImage:probe error:&probeError];
    if (!probeResult) {
      reject(@"unsupported",
             [NSString stringWithFormat:
                 @"body pose is unsupported on this runtime: %@",
                 probeError.localizedDescription ?: @"setup failed"],
             probeError);
      return;
    }
    resolve(@YES);
  } else {
    reject(@"unsupported_os",
           @"iOS 14+ required for VNDetectHumanBodyPoseRequest",
           nil);
  }
}

RCT_EXPORT_METHOD(detectOnImage:(NSString *)imagePath
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  if (@available(iOS 14.0, *)) {
    NSString *normalized = [imagePath hasPrefix:@"file://"]
        ? imagePath
        : [NSString stringWithFormat:@"file://%@", imagePath];
    NSURL *url = [NSURL URLWithString:normalized];
    if (!url) {
      reject(@"invalid_image",
             [NSString stringWithFormat:@"Bad URL: %@", imagePath],
             nil);
      return;
    }
    CIImage *image = [CIImage imageWithContentsOfURL:url];
    if (!image) {
      reject(@"invalid_image",
             [NSString stringWithFormat:@"Could not load image at %@", imagePath],
             nil);
      return;
    }

    NSError *visionError = nil;
    NSArray *landmarks = [self landmarksFromCIImage:image error:&visionError];
    if (!landmarks) {
      reject(@"detect_failed",
             visionError.localizedDescription ?: @"detect failed",
             visionError);
      return;
    }

    resolve(landmarks);
  } else {
    reject(@"unsupported_os", @"iOS 14+ required", nil);
  }
}

RCT_EXPORT_METHOD(detectOnVideoFrame:(NSString *)videoPath
                  timeMs:(nonnull NSNumber *)timeMs
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  if (@available(iOS 14.0, *)) {
    // Accept remote URLs (signed library URLs carry a scheme) and bare
    // file paths (fresh recordings). A path with no scheme is a file.
    NSURL *url = [videoPath containsString:@"://"]
        ? [NSURL URLWithString:videoPath]
        : [NSURL fileURLWithPath:videoPath];
    if (!url) {
      reject(@"invalid_video",
             [NSString stringWithFormat:@"Bad URL: %@", videoPath],
             nil);
      return;
    }

    // Reuse a warm, cached generator for this URL (see generatorForURL:).
    AVAssetImageGenerator *generator = [self generatorForURL:url];

    CMTime time = CMTimeMakeWithSeconds(timeMs.doubleValue / 1000.0, 600);

    // The async generator loads the asset's tracks itself, which is
    // required for remote URLs (library videos are signed Supabase
    // URLs). The synchronous copyCGImageAtTime: does NOT wait for a
    // remote asset to load and returns nil. We run on a serial
    // background queue already, so a semaphore wait here is safe and
    // keeps the promise-style API.
    dispatch_semaphore_t sema = dispatch_semaphore_create(0);
    __block CGImageRef resultImage = NULL;
    __block NSError *genError = nil;
    [generator generateCGImageAsynchronouslyForTime:time
                                  completionHandler:
        ^(CGImageRef _Nullable image, CMTime actualTime, NSError * _Nullable error) {
      if (image) {
        resultImage = CGImageRetain(image);
      }
      genError = error;
      dispatch_semaphore_signal(sema);
    }];
    dispatch_time_t deadline =
        dispatch_time(DISPATCH_TIME_NOW, (int64_t)(15 * NSEC_PER_SEC));
    if (dispatch_semaphore_wait(sema, deadline) != 0) {
      reject(@"frame_timeout", @"frame extraction timed out", nil);
      return;
    }
    if (!resultImage || genError) {
      if (resultImage) {
        CGImageRelease(resultImage);
      }
      reject(@"frame_failed",
             genError.localizedDescription ?: @"could not extract frame",
             genError);
      return;
    }

    NSUInteger width = CGImageGetWidth(resultImage);
    NSUInteger height = CGImageGetHeight(resultImage);
    CIImage *image = [CIImage imageWithCGImage:resultImage];
    CGImageRelease(resultImage);

    NSError *visionError = nil;
    NSArray *landmarks = [self landmarksFromCIImage:image error:&visionError];
    if (!landmarks) {
      reject(@"detect_failed",
             visionError.localizedDescription ?: @"detect failed",
             visionError);
      return;
    }

    resolve(@{
      @"width": @(width),
      @"height": @(height),
      @"landmarks": landmarks,
    });
  } else {
    reject(@"unsupported_os", @"iOS 14+ required", nil);
  }
}

RCT_EXPORT_METHOD(detectPosesForVideo:(NSString *)videoPath
                  fps:(nonnull NSNumber *)fps
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  if (@available(iOS 14.0, *)) {
    NSURL *srcURL = [videoPath containsString:@"://"]
        ? [NSURL URLWithString:videoPath]
        : [NSURL fileURLWithPath:videoPath];
    if (!srcURL) {
      reject(@"invalid_video",
             [NSString stringWithFormat:@"Bad URL: %@", videoPath],
             nil);
      return;
    }

    // Download to a local file once — batch seeking a remote asset is
    // prohibitively slow.
    NSError *dlError = nil;
    NSURL *localURL = [self localURLForVideo:srcURL error:&dlError];
    if (!localURL) {
      reject(@"download_failed",
             dlError.localizedDescription ?: @"could not download video",
             dlError);
      return;
    }

    AVURLAsset *asset = [AVURLAsset URLAssetWithURL:localURL options:nil];
    Float64 duration = CMTimeGetSeconds(asset.duration);
    double sampleFps = fps.doubleValue > 0 ? fps.doubleValue : 30.0;
    if (!(duration > 0)) {
      reject(@"invalid_video", @"could not read video duration", nil);
      return;
    }

    AVAssetImageGenerator *generator =
        [AVAssetImageGenerator assetImageGeneratorWithAsset:asset];
    generator.appliesPreferredTrackTransform = YES;
    generator.maximumSize = CGSizeMake(1280, 1280);
    // Half-sample tolerance keeps extraction fast while staying on the
    // right frame.
    CMTime tol = CMTimeMakeWithSeconds(1.0 / (sampleFps * 2.0), 600);
    generator.requestedTimeToleranceBefore = tol;
    generator.requestedTimeToleranceAfter = tol;
    // Strong ref so the generator survives past this method returning.
    self.activeBatchGenerator = generator;

    // One sample every 1/fps seconds across the clip.
    double step = 1.0 / sampleFps;
    NSMutableArray<NSValue *> *times = [NSMutableArray array];
    for (double t = 0; t < duration; t += step) {
      [times addObject:[NSValue valueWithCMTime:CMTimeMakeWithSeconds(t, 600)]];
    }
    NSUInteger total = times.count;
    if (total == 0) {
      self.activeBatchGenerator = nil;
      resolve(@[]);
      return;
    }

    // The completion handler is invoked serially per requested time, so
    // appending to `frames` / bumping `completed` needs no lock. Frames
    // may arrive out of order — the JS side sorts by timeMs.
    NSMutableArray *frames = [NSMutableArray arrayWithCapacity:total];
    __block NSUInteger completed = 0;
    __weak CaddiePose *weakSelf = self;

    [generator generateCGImagesAsynchronouslyForTimes:times
        completionHandler:^(CMTime requestedTime,
                            CGImageRef _Nullable image,
                            CMTime actualTime,
                            AVAssetImageGeneratorResult result,
                            NSError *_Nullable error) {
      if (result == AVAssetImageGeneratorSucceeded && image) {
        CIImage *ci = [CIImage imageWithCGImage:image];
        NSError *visionError = nil;
        NSArray *landmarks = [weakSelf landmarksFromCIImage:ci
                                                      error:&visionError];
        if (landmarks) {
          [frames addObject:@{
            @"timeMs": @(CMTimeGetSeconds(requestedTime) * 1000.0),
            @"width": @(CGImageGetWidth(image)),
            @"height": @(CGImageGetHeight(image)),
            @"landmarks": landmarks,
          }];
        }
      }
      // Failed / Cancelled frames are simply skipped (JS tolerates gaps).
      completed++;
      if (completed >= total) {
        weakSelf.activeBatchGenerator = nil;
        resolve(frames);
      }
    }];
  } else {
    reject(@"unsupported_os", @"iOS 14+ required", nil);
  }
}

// Extract specific frames as JPEGs (Phase 4.2 frame extraction). Unlike the
// pose methods, this returns the actual pixels: one base64-encoded JPEG per
// requested timestamp, in the SAME order as `timesMs`, capped to `maxSize`
// on the long side at `quality` (0–100). Reuses the proven local-download +
// AVAssetImageGenerator path so the frames Claude sees come from the exact
// decode pipeline Vision used. Rejects on the first failed frame so the JS
// side gets a clean 8-or-error contract (Claude needs all 8).
RCT_EXPORT_METHOD(extractJpegFrames:(NSString *)videoPath
                  timesMs:(NSArray<NSNumber *> *)timesMs
                  maxSize:(nonnull NSNumber *)maxSize
                  quality:(nonnull NSNumber *)quality
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  if (@available(iOS 14.0, *)) {
    NSURL *srcURL = [videoPath containsString:@"://"]
        ? [NSURL URLWithString:videoPath]
        : [NSURL fileURLWithPath:videoPath];
    if (!srcURL) {
      reject(@"invalid_video",
             [NSString stringWithFormat:@"Bad URL: %@", videoPath],
             nil);
      return;
    }
    if (timesMs.count == 0) {
      resolve(@[]);
      return;
    }

    // Local copy once — extracting from a remote asset per frame is slow.
    NSError *dlError = nil;
    NSURL *localURL = [self localURLForVideo:srcURL error:&dlError];
    if (!localURL) {
      reject(@"download_failed",
             dlError.localizedDescription ?: @"could not download video",
             dlError);
      return;
    }

    AVURLAsset *asset = [AVURLAsset URLAssetWithURL:localURL options:nil];
    AVAssetImageGenerator *generator =
        [AVAssetImageGenerator assetImageGeneratorWithAsset:asset];
    // Upright frame (matches how react-native-video shows it). maximumSize
    // fits the image within the box preserving aspect, so the long side is
    // capped at maxSize — exactly the spec's "max 1200px".
    generator.appliesPreferredTrackTransform = YES;
    CGFloat box = MAX(64.0, maxSize.doubleValue);
    generator.maximumSize = CGSizeMake(box, box);
    CMTime tol = CMTimeMakeWithSeconds(0.05, 600);
    generator.requestedTimeToleranceBefore = tol;
    generator.requestedTimeToleranceAfter = tol;
    // Strong ref so the generator outlives this method returning.
    self.activeFrameGenerator = generator;

    NSUInteger total = timesMs.count;
    NSMutableArray<NSValue *> *times = [NSMutableArray arrayWithCapacity:total];
    for (NSNumber *ms in timesMs) {
      [times addObject:
          [NSValue valueWithCMTime:CMTimeMakeWithSeconds(ms.doubleValue / 1000.0, 600)]];
    }

    // Results are slotted by requested-time index (frames can arrive out of
    // order) so the output order matches the input order.
    NSMutableArray *results = [NSMutableArray arrayWithCapacity:total];
    for (NSUInteger i = 0; i < total; i++) {
      [results addObject:[NSNull null]];
    }
    CGFloat jpegQuality = MAX(0.0, MIN(1.0, quality.doubleValue / 100.0));
    __block NSUInteger completed = 0;
    __block BOOL settled = NO;
    __weak CaddiePose *weakSelf = self;

    [generator generateCGImagesAsynchronouslyForTimes:times
        completionHandler:^(CMTime requestedTime,
                            CGImageRef _Nullable image,
                            CMTime actualTime,
                            AVAssetImageGeneratorResult result,
                            NSError *_Nullable error) {
      if (settled) {
        return;
      }
      if (result != AVAssetImageGeneratorSucceeded || !image) {
        settled = YES;
        weakSelf.activeFrameGenerator = nil;
        reject(@"frame_failed",
               error.localizedDescription ?: @"could not extract a frame",
               error);
        return;
      }

      UIImage *uiImage = [UIImage imageWithCGImage:image];
      NSData *jpeg = UIImageJPEGRepresentation(uiImage, jpegQuality);
      if (!jpeg) {
        settled = YES;
        weakSelf.activeFrameGenerator = nil;
        reject(@"encode_failed", @"could not JPEG-encode a frame", nil);
        return;
      }

      // Slot by closest requested time (robust to any CMTime normalisation;
      // the JS side guarantees the timestamps are distinct).
      Float64 reqSec = CMTimeGetSeconds(requestedTime);
      NSUInteger bestIdx = 0;
      Float64 bestDelta = INFINITY;
      for (NSUInteger i = 0; i < total; i++) {
        Float64 delta = fabs(CMTimeGetSeconds([times[i] CMTimeValue]) - reqSec);
        if (delta < bestDelta) {
          bestDelta = delta;
          bestIdx = i;
        }
      }
      results[bestIdx] = [jpeg base64EncodedStringWithOptions:0];

      completed++;
      if (completed >= total) {
        settled = YES;
        weakSelf.activeFrameGenerator = nil;
        // Guard the all-8 contract: a duplicate-time collision could leave a
        // hole. Shouldn't happen (JS dedupes) but never resolve a NSNull.
        if ([results containsObject:[NSNull null]]) {
          reject(@"frame_failed", @"a frame slot was left unfilled", nil);
          return;
        }
        resolve(results);
      }
    }];
  } else {
    reject(@"unsupported_os", @"iOS 14+ required", nil);
  }
}

@end
