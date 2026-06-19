//
//  Caddie-Bridging-Header.h
//  Exposes Objective-C symbols to Swift. react-native-orientation-locker's
//  `Orientation` class is read by AppDelegate.supportedInterfaceOrientationsFor
//  so the OS honours per-screen orientation locks (portrait everywhere except
//  the Comparison screen). See PROJECT_SPEC §22 5.1 / TODO.md (Phase 5.1c).
//

#import <react-native-orientation-locker/Orientation.h>
