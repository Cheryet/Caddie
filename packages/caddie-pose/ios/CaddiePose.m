// CaddiePose — Apple Vision pose detection bridge
//
// One-file Objective-C native module exposed to React Native via
// `NativeModules.CaddiePose`. Three methods:
//
//   initialize()                     -> resolves true on iOS 14+
//   detectOnImage(imagePath)         -> resolves [{name,x,y,z,visibility}, ...]
//   detectOnVideoFrame(path, timeMs) -> resolves {width,height,landmarks:[...]}
//
// Y is flipped on emit so (0,0) is top-left, matching our SVG /
// DrawingCanvas coordinate convention. The Z dimension is padded
// with 0 because VNDetectHumanBodyPoseRequest is 2D — the
// downstream `PoseLandmark` type carries Z for forward compatibility
// with a 3D engine (Phase 3.x may revisit).
//
// `detectOnVideoFrame` (Phase 3.2) grabs the exact frame from the
// recorded video via AVAssetImageGenerator rather than a screen
// snapshot: react-native-view-shot can't capture the AVPlayerLayer's
// pixels on iOS (it comes back black). The generator applies the
// preferred track transform so the CGImage is upright — the returned
// width/height describe that upright image so the JS overlay can map
// the normalised landmarks into the letterboxed video rect without
// guessing display orientation.
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

@interface CaddiePose : NSObject <RCTBridgeModule>
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
// returns nil and sets *error on a genuine Vision failure.
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

RCT_EXPORT_METHOD(initialize:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  if (@available(iOS 14.0, *)) {
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

    AVURLAsset *asset = [AVURLAsset URLAssetWithURL:url options:nil];
    AVAssetImageGenerator *generator =
        [AVAssetImageGenerator assetImageGeneratorWithAsset:asset];
    // Upright frame so it matches how react-native-video displays it
    // (resizeMode="contain") — keeps the overlay aligned.
    generator.appliesPreferredTrackTransform = YES;
    // A small tolerance keeps scrub responsive; landing within ~1 frame
    // of the requested time is imperceptible for a skeleton overlay.
    CMTime tolerance = CMTimeMakeWithSeconds(0.1, 600);
    generator.requestedTimeToleranceBefore = tolerance;
    generator.requestedTimeToleranceAfter = tolerance;

    CMTime time = CMTimeMakeWithSeconds(timeMs.doubleValue / 1000.0, 600);
    NSError *genError = nil;
    CMTime actualTime = kCMTimeZero;
    CGImageRef cgImage = [generator copyCGImageAtTime:time
                                           actualTime:&actualTime
                                                error:&genError];
    if (!cgImage || genError) {
      reject(@"frame_failed",
             genError.localizedDescription ?: @"could not extract frame",
             genError);
      return;
    }

    NSUInteger width = CGImageGetWidth(cgImage);
    NSUInteger height = CGImageGetHeight(cgImage);
    CIImage *image = [CIImage imageWithCGImage:cgImage];
    CGImageRelease(cgImage);

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

@end
