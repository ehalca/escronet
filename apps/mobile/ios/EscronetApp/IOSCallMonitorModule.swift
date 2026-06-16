import Foundation
import CallKit

/// Passively observes call state using CXCallObserver and emits the same events
/// that the Android CallDetectionForegroundService emits, so callEventService.ts
/// works unchanged on iOS.
///
/// Limitation (Phase A / MVP): CXCall does not expose the remote phone number.
/// callerHash is therefore sent as an empty string until a Call Directory
/// Extension is implemented (Phase B).
@objc(IOSCallMonitorModule)
class IOSCallMonitorModule: RCTEventEmitter {

  private let callObserver = CXCallObserver()
  private var callStartedAt: Date?
  private var thresholdTimer: Timer?

  private static let thresholdSeconds: TimeInterval = 30

  // MARK: – RCTEventEmitter

  override static func requiresMainQueueSetup() -> Bool { true }

  override func supportedEvents() -> [String]! {
    ["call_threshold_reached", "call_ended"]
  }

  override init() {
    super.init()
    callObserver.setDelegate(self, queue: .main)
  }
}

// MARK: – CXCallObserverDelegate

extension IOSCallMonitorModule: CXCallObserverDelegate {
  func callObserver(_ callObserver: CXCallObserver, callChanged call: CXCall) {
    if call.hasConnected && !call.hasEnded {
      onCallConnected()
    } else if call.hasEnded {
      onCallEnded()
    }
  }
}

// MARK: – Private

private extension IOSCallMonitorModule {
  func onCallConnected() {
    guard callStartedAt == nil else { return }
    callStartedAt = Date()

    thresholdTimer = Timer.scheduledTimer(
      withTimeInterval: IOSCallMonitorModule.thresholdSeconds,
      repeats: false
    ) { [weak self] _ in
      self?.emitThreshold()
    }
  }

  func onCallEnded() {
    guard callStartedAt != nil else { return }
    thresholdTimer?.invalidate()
    thresholdTimer = nil
    callStartedAt = nil
    sendEvent(withName: "call_ended", body: nil)
  }

  func emitThreshold() {
    guard let startedAt = callStartedAt else { return }
    let fmt = ISO8601DateFormatter()
    sendEvent(withName: "call_threshold_reached", body: [
      "callerHash": "",
      "callDuration": Int(IOSCallMonitorModule.thresholdSeconds),
      "detectedAt": fmt.string(from: Date()),
      "callStartedAt": fmt.string(from: startedAt),
    ])
  }
}
