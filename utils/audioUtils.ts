
import { Blob } from '@google/genai';

/**
 * Manual decode implementation as required by Gemini API guidelines.
 */
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Manual encode implementation as required by Gemini API guidelines.
 */
export function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Export existing names as aliases for backward compatibility
export const base64ToUint8Array = decode;
export const arrayBufferToBase64 = (buffer: ArrayBuffer) => encode(new Uint8Array(buffer));

/**
 * Decodes raw PCM data from the API into an AudioBuffer.
 * Do not use AudioContext.decodeAudioData as it expects file headers (WAV/MP3).
 */
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Encodes microphone input (Float32Array) into raw PCM bytes for the Live API.
 */
export function createPcmBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Scaling factor 32768 for raw PCM as per Gemini API documentation
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    // Standard audio MIME type for Gemini Live API
    mimeType: 'audio/pcm;rate=16000',
  };
}
