import { openai, OPENAI_CONFIG } from './config.js';
import { logger } from '../../utils/logger.js';
import fs from 'fs';
import path from 'path';

export interface WhisperTranscription {
  text: string;
  segments?: Array<{
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
    tokens: number[];
    temperature: number;
    avg_logprob: number;
    compression_ratio: number;
    no_speech_prob: number;
  }>;
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
  language?: string;
  duration?: number;
}

export interface TranscriptionOptions {
  language?: string;
  prompt?: string;
  response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  temperature?: number;
  timestamp_granularities?: Array<'word' | 'segment'>;
}

export class WhisperService {
  async transcribeAudio(
    audioBuffer: Buffer,
    filename: string,
    options: TranscriptionOptions = {}
  ): Promise<WhisperTranscription> {
    logger.info('Starting Whisper transcription', { 
      filename, 
      bufferSize: audioBuffer.length,
      options 
    });

    let tempFile: string | null = null;
    
    try {
      // Create a temporary file from the buffer in outputs/temp
      const tempDir = path.join(process.cwd(), 'outputs', 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      tempFile = path.join(tempDir, `${Date.now()}-${filename}`);
      logger.debug('Creating temporary file', { tempFile });
      fs.writeFileSync(tempFile, audioBuffer);

      logger.info('Calling OpenAI Whisper API', { tempFile });
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFile),
        model: OPENAI_CONFIG.WHISPER_MODEL,
        response_format: options.response_format || 'verbose_json',
        timestamp_granularities: options.timestamp_granularities || ['word', 'segment'],
        language: options.language,
        prompt: options.prompt,
        temperature: options.temperature || 0,
      });

      logger.info('Whisper API call successful', { 
        textLength: transcription.text?.length || 0,
        hasSegments: !!(transcription as any).segments
      });

      return transcription as WhisperTranscription;
    } catch (error) {
      logger.error('Whisper API Error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        filename,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`Speech-to-text failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Clean up temp file
      if (tempFile && fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile);
          logger.debug('Temporary file cleaned up', { tempFile });
        } catch (cleanupError) {
          logger.warn('Failed to clean up temporary file', { tempFile, error: cleanupError });
        }
      }
    }
  }

  async getAudioDuration(audioBuffer: Buffer): Promise<number> {
    // This is a simplified duration calculation
    // In a production app, you'd use a proper audio library like ffprobe
    return Math.floor(audioBuffer.length / 16000); // Rough estimate for common audio formats
  }

  validateAudioFile(file: Express.Multer.File): { valid: boolean; error?: string } {
    const validMimeTypes = [
      'audio/mp3',
      'audio/mpeg',
      'audio/wav',
      'audio/m4a',
      'audio/webm',
      'audio/ogg'
    ];

    if (!validMimeTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: 'Invalid file type. Supported formats: MP3, WAV, M4A, WebM'
      };
    }

    const maxSize = 25 * 1024 * 1024; // 25MB OpenAI limit
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size exceeds 25MB limit'
      };
    }

    return { valid: true };
  }

  async preprocessAudio(audioBuffer: Buffer, filename: string): Promise<Buffer> {
    // In a production app, you might want to:
    // - Normalize audio levels
    // - Remove silence
    // - Convert to optimal format
    // - Apply noise reduction
    
    // For now, return as-is
    return audioBuffer;
  }
}

export const whisperService = new WhisperService();