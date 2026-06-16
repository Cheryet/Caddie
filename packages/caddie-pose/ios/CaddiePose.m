// CaddiePose — Apple Vision pose detection bridge
//
// One-file Objective-C native module exposed to React Native via
// `NativeModules.CaddiePose`. Two methods:
//
//   initialize()              -> resolves true on iOS 14+
//   detectOnImage(imagePath)  -> resolves [{name,x,y,z,visibility}, ...]
//
// Y is flipped on emit so (0,0) is top-left, matching our SVG /
// DrawingCanvas coordinate convention. The Z dimension is padded
// with 0 because VNDetectHumanBodyPoseRequest is 2D — the
// downstream `PoseLandmark` type carries Z for forward compatibility
// with a 3D engine (Phase 3.x may revisit).
//
// Detection runs on a serial background queue so the JS thread
// stays responsive even when the model is busy.
//
// Spec: PROJECT_SPEC.md §22 Phase 3.1. §16 Risk 4 explicitly
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

    VNDetectHumanBodyPoseRequest *request =
        [[VNDetectHumanBodyPoseRequest alloc] init];
    VNImageRequestHandler *handler =
        [[VNImageRequestHandler alloc] initWithCIImage:image options:@{}];
    NSError *requestError = nil;
    BOOL ok = [handler performRequests:@[request] error:&requestError];
    if (!ok || requestError) {
      reject(@"detect_failed",
             requestError.localizedDescription ?: @"perform failed",
             requestError);
      return;
    }

    VNHumanBodyPoseObservation *observation =
        (VNHumanBodyPoseObservation *)request.results.firstObject;
    if (!observation) {
      // No body detected — empty array, not an error.
      resolve(@[]);
      return;
    }

    NSError *pointsError = nil;
    NSDictionary<VNHumanBodyPoseObservationJointName, VNRecognizedPoint *> *points =
        [observation recognizedPointsForGroupKey:VNHumanBodyPoseObservationJointsGroupNameAll
                                            error:&pointsError];
    if (pointsError) {
      reject(@"detect_failed",
             pointsError.localizedDescription,
             pointsError);
      return;
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

    resolve(landmarks);
  } else {
    reject(@"unsupported_os", @"iOS 14+ required", nil);
  }
}

@end
