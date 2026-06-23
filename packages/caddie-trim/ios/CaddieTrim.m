// CaddieTrim — AVFoundation video trim bridge
//
// One-file Objective-C native module exposed to React Native via
// `NativeModules.CaddieTrim`. One method:
//
//   trimVideo(inputPath, startMs, endMs) -> { uri, durationMs }
//
// Re-encodes the [startMs, endMs] slice of a LOCAL clip to a new mp4 in
// the temp dir via AVAssetExportSession (highest-quality preset, so the
// cut is frame-accurate rather than snapping to the nearest keyframe the
// way a passthrough export would). Used by the playback Save flow to trim
// a fresh recording / import down to just the swing BEFORE upload —
// smaller storage and sharper AI frame extraction (PROJECT_SPEC §13 /
// TODO.md "Future feature — Video trim").
//
// Only ever operates on local files (the recording/import hasn't uploaded
// yet), so unlike CaddiePose there's no remote-download path. Mirrors the
// CaddiePose bridge structure (RCT_EXPORT_MODULE, serial methodQueue,
// promise resolve/reject) so the two native modules stay consistent.
//
// Both AVAssetExportSession and AVAssetImageGenerator run on the iOS
// Simulator (unlike Vision body-pose), so this feature is fully
// verifiable in the simulator.

#import <React/RCTBridgeModule.h>
#import <AVFoundation/AVFoundation.h>
#import <CoreMedia/CoreMedia.h>
#import <Foundation/Foundation.h>

@interface CaddieTrim : NSObject <RCTBridgeModule>
@end

@implementation CaddieTrim

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (dispatch_queue_t)methodQueue {
  // Serial background queue — export is I/O + codec bound; keep it off
  // the JS thread.
  static dispatch_once_t once;
  static dispatch_queue_t queue;
  dispatch_once(&once, ^{
    queue = dispatch_queue_create("caddie.trim.export", DISPATCH_QUEUE_SERIAL);
  });
  return queue;
}

RCT_EXPORT_METHOD(trimVideo:(NSString *)inputPath
                  startMs:(nonnull NSNumber *)startMs
                  endMs:(nonnull NSNumber *)endMs
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  // Accept a bare file path (fresh recordings) or a file:// URL.
  NSURL *srcURL = [inputPath containsString:@"://"]
      ? [NSURL URLWithString:inputPath]
      : [NSURL fileURLWithPath:inputPath];
  if (!srcURL) {
    reject(@"invalid_video",
           [NSString stringWithFormat:@"Bad input path: %@", inputPath],
           nil);
    return;
  }

  double startSec = startMs.doubleValue / 1000.0;
  double endSec = endMs.doubleValue / 1000.0;
  if (!(endSec > startSec)) {
    reject(@"invalid_range",
           [NSString stringWithFormat:
               @"end (%@ms) must be after start (%@ms)", endMs, startMs],
           nil);
    return;
  }

  AVURLAsset *asset = [AVURLAsset URLAssetWithURL:srcURL options:nil];
  Float64 durationSec = CMTimeGetSeconds(asset.duration);
  if (!(durationSec > 0)) {
    reject(@"invalid_video", @"could not read video duration", nil);
    return;
  }
  // Clamp to the asset's real bounds so JS rounding can't push the end
  // past the clip and fail the export.
  if (startSec < 0) {
    startSec = 0;
  }
  if (endSec > durationSec) {
    endSec = durationSec;
  }

  AVAssetExportSession *session = [[AVAssetExportSession alloc]
      initWithAsset:asset
         presetName:AVAssetExportPresetHighestQuality];
  if (!session) {
    reject(@"export_unsupported",
           @"could not create an export session for this video", nil);
    return;
  }

  NSString *fileName =
      [[NSUUID UUID].UUIDString stringByAppendingPathExtension:@"mp4"];
  NSURL *outURL = [[NSURL fileURLWithPath:NSTemporaryDirectory()]
      URLByAppendingPathComponent:fileName];

  CMTime start = CMTimeMakeWithSeconds(startSec, 600);
  CMTime end = CMTimeMakeWithSeconds(endSec, 600);
  session.timeRange = CMTimeRangeFromTimeToTime(start, end);
  session.outputURL = outURL;
  session.outputFileType = AVFileTypeMPEG4;
  session.shouldOptimizeForNetworkUse = YES;

  // endSec/startSec are clamped above; capture them for the result.
  double resultMs = (endSec - startSec) * 1000.0;

  [session exportAsynchronouslyWithCompletionHandler:^{
    switch (session.status) {
      case AVAssetExportSessionStatusCompleted:
        // Report the requested duration; the player re-reports the exact
        // value on load and the row is backfilled from that.
        resolve(@{
          @"uri": outURL.absoluteString,
          @"durationMs": @(resultMs),
        });
        break;
      case AVAssetExportSessionStatusCancelled:
        reject(@"export_cancelled", @"trim was cancelled", session.error);
        break;
      default:
        reject(@"export_failed",
               session.error.localizedDescription ?: @"could not trim video",
               session.error);
        break;
    }
  }];
}

@end
