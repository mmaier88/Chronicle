import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

// Lazy-initialize ElevenLabs client (avoid build-time errors)
let _elevenlabs: ElevenLabsClient | null = null;

function getClient(): ElevenLabsClient {
  if (!_elevenlabs) {
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY environment variable is required");
    }
    _elevenlabs = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });
  }
  return _elevenlabs;
}

// Default voice for book narration (Rachel - warm, clear, great for narration)
export const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

// Curated voices for book narration
export const BOOK_VOICES = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", description: "Warm, clear female voice - great for non-fiction" },
  { id: "29vD33N1CtxCmqQRPOHJ", name: "Drew", description: "Confident male voice - great for business books" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", description: "Soft, engaging female voice - great for literary fiction" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni", description: "Well-rounded male voice - versatile narrator" },
  { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli", description: "Young female voice - great for contemporary fiction" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", description: "Deep male voice - great for thrillers and drama" },
] as const;

export type VoiceId = typeof BOOK_VOICES[number]["id"];

/**
 * Preprocess text for TTS generation
 * - Removes markdown formatting
 * - Normalizes whitespace
 * - Handles special characters
 */
export function preprocessTextForTTS(text: string): string {
  return text
    // Remove markdown headers
    .replace(/^#{1,6}\s+/gm, "")
    // Remove bold/italic markers
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    // Remove links, keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove inline code
    .replace(/`([^`]+)`/g, "$1")
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, "")
    // Convert em-dashes to spoken pause
    .replace(/—/g, " — ")
    // Normalize quotes
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    // Normalize ellipsis
    .replace(/\.{3,}/g, "...")
    // Normalize multiple newlines to single
    .replace(/\n{3,}/g, "\n\n")
    // Trim whitespace
    .trim();
}

/**
 * Generate speech from text using ElevenLabs
 * Returns audio as a Buffer (MP3 format)
 */
export async function generateSpeech(
  text: string,
  voiceId: string = DEFAULT_VOICE_ID
): Promise<Buffer> {
  const cleanText = preprocessTextForTTS(text);

  if (!cleanText || cleanText.length === 0) {
    throw new Error("No text to generate speech from");
  }

  // ElevenLabs has a ~5000 character limit per request
  if (cleanText.length > 5000) {
    throw new Error(`Text too long (${cleanText.length} chars). Max 5000 characters per request.`);
  }

  const audioStream = await getClient().textToSpeech.convert(voiceId, {
    text: cleanText,
    modelId: "eleven_turbo_v2_5", // Fast, cost-effective model
    outputFormat: "mp3_44100_128", // High quality MP3
    voiceSettings: {
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0.0,
      useSpeakerBoost: true,
    },
  });

  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  const reader = audioStream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

/**
 * Generate speech for long text by chunking
 * Splits at paragraph boundaries and concatenates audio
 */
export async function generateSpeechChunked(
  text: string,
  voiceId: string = DEFAULT_VOICE_ID
): Promise<Buffer> {
  const cleanText = preprocessTextForTTS(text);

  if (cleanText.length <= 5000) {
    return generateSpeech(cleanText, voiceId);
  }

  // Split into paragraphs
  const paragraphs = cleanText.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    if ((currentChunk + "\n\n" + paragraph).length > 4800) {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = paragraph;
    } else {
      currentChunk = currentChunk ? currentChunk + "\n\n" + paragraph : paragraph;
    }
  }
  if (currentChunk) {
    chunks.push(currentChunk);
  }

  // Generate audio for each chunk
  const audioBuffers: Buffer[] = [];
  for (const chunk of chunks) {
    const audio = await generateSpeech(chunk, voiceId);
    audioBuffers.push(audio);
  }

  // Concatenate all audio buffers
  return Buffer.concat(audioBuffers);
}

/**
 * Get available voices from ElevenLabs
 */
export async function getVoices() {
  const response = await getClient().voices.getAll();
  return response.voices;
}

/**
 * Compute MD5 hash of text for cache key
 */
export function computeContentHash(text: string): string {
  const crypto = require("crypto");
  return crypto.createHash("md5").update(text).digest("hex");
}

/**
 * Estimate audio duration from text (rough approximation)
 * Average speaking rate: ~150 words per minute
 */
export function estimateDuration(text: string): number {
  const wordCount = text.split(/\s+/).length;
  return Math.ceil((wordCount / 150) * 60); // seconds
}
