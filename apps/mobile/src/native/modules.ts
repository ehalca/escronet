import { NativeModules, Platform } from "react-native";

export type DetectionResult = {
  label: "scam" | "legit";
  score: number;
  modelVersion: string;
};

export interface AndroidCallMonitorModule {
  startCallSession(callId: string): Promise<void>;
  stopCallSession(callId: string): Promise<void>;
  readAudioChunk(callId: string, seconds: number): Promise<string>;
}

export interface WhisperModule {
  prewarm(): Promise<void>;
  transcribe(audioChunkPath: string): Promise<string>;
}

export interface ClassifierModule {
  classifyTranscript(transcript: string): Promise<DetectionResult>;
}

export interface IOSCallKitModule {
  syncBlockedHashes(hashes: string[]): Promise<void>;
}

const modules = NativeModules as {
  CallMonitorModule?: AndroidCallMonitorModule;
  WhisperModule?: WhisperModule;
  ClassifierModule?: ClassifierModule;
  CallKitModule?: IOSCallKitModule;
  IOSCallMonitorModule?: Record<string, unknown>;
};

export function requireAndroidCallMonitor(): AndroidCallMonitorModule {
  if (Platform.OS !== "android" || !modules.CallMonitorModule) {
    throw new Error("CallMonitorModule is only available on Android");
  }
  return modules.CallMonitorModule;
}

/** Returns true when the iOS native call observer is linked and active. */
export function hasIOSCallMonitor(): boolean {
  return Platform.OS === "ios" && modules.IOSCallMonitorModule != null;
}

export function requireWhisperModule(): WhisperModule {
  if (!modules.WhisperModule) {
    throw new Error("WhisperModule is not linked");
  }
  return modules.WhisperModule;
}

export function requireClassifierModule(): ClassifierModule {
  if (!modules.ClassifierModule) {
    throw new Error("ClassifierModule is not linked");
  }
  return modules.ClassifierModule;
}

export function getIOSCallKitModule(): IOSCallKitModule | undefined {
  return modules.CallKitModule;
}
