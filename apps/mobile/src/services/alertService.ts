export type AlertPayload = {
  userId: string;
  callId: string;
  score: number;
  transcriptPreview?: string;
  detectedAt: string;
};

export async function postScamAlert(
  apiBaseUrl: string,
  payload: AlertPayload,
  token: string,
): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/alerts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Alert upload failed: ${response.status}`);
  }
}
