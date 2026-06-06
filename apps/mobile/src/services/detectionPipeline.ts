import {
  requireClassifierModule,
  requireWhisperModule,
} from "../native/modules";

export type ChunkEvaluation = {
  transcript: string;
  score: number;
  isScam: boolean;
};

const DEFAULT_THRESHOLD = 0.75;

export class DetectionPipeline {
  private readonly whisper = requireWhisperModule();
  private readonly classifier = requireClassifierModule();

  async prewarm(): Promise<void> {
    await this.whisper.prewarm();
  }

  async evaluateChunk(
    audioChunkPath: string,
    threshold = DEFAULT_THRESHOLD,
  ): Promise<ChunkEvaluation> {
    const transcript = await this.whisper.transcribe(audioChunkPath);
    const classification = await this.classifier.classifyTranscript(transcript);

    return {
      transcript,
      score: classification.score,
      isScam:
        classification.label === "scam" && classification.score >= threshold,
    };
  }
}
