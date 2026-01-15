/**
 * ElevenLabs voice constants
 * Separated from client.ts to avoid bundling the SDK in client-side code
 */

// Default voice for book narration
export const DEFAULT_VOICE_ID = "nPczCjzI2devNBz1zQrb";

// Available voices for book narration
export const BOOK_VOICES = [
  { id: "nPczCjzI2devNBz1zQrb", name: "Marcus", gender: "male", description: "Deep, engaging male voice - default narrator" },
  { id: "dCnu06FiOZma2KVNUoPZ", name: "Aurora", gender: "female", description: "Warm, expressive female voice - alternative narrator" },
] as const;

export type VoiceId = typeof BOOK_VOICES[number]["id"];
