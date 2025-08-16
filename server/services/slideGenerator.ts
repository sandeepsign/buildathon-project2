import { whisperService, WhisperTranscription } from './openai/whisper.js';
import { gpt4Service, PresentationStructure, SlideContent } from './openai/gpt4.js';
import { htmlBundler } from './htmlBundler.js';
import { storage } from '../storage.js';
import { logger } from '../utils/logger.js';
import type { Presentation } from '@shared/schema';

export interface ProcessingProgress {
  step: 'upload' | 'transcription' | 'analysis' | 'generation' | 'bundling' | 'complete';
  progress: number;
  message: string;
  error?: string;
}

export interface SlideGenerationOptions {
  theme?: string;
  targetSlideCount?: number;
  includeCharts?: boolean;
  optimizeContent?: boolean;
}

export class SlideGeneratorService {
  private progressCallbacks: Map<string, (progress: ProcessingProgress) => void> = new Map();

  registerProgressCallback(presentationId: string, callback: (progress: ProcessingProgress) => void) {
    this.progressCallbacks.set(presentationId, callback);
  }

  unregisterProgressCallback(presentationId: string) {
    this.progressCallbacks.delete(presentationId);
  }

  private updateProgress(presentationId: string, progress: ProcessingProgress) {
    const callback = this.progressCallbacks.get(presentationId);
    if (callback) {
      callback(progress);
    }
  }

  async generatePresentation(
    presentationId: string,
    audioBuffer: Buffer,
    filename: string,
    options: SlideGenerationOptions = {}
  ): Promise<PresentationStructure> {
    logger.info('Starting presentation generation', { 
      presentationId, 
      filename, 
      audioBufferSize: audioBuffer.length,
      options 
    });

    try {
      // Step 1: Update status to processing
      logger.info('Updating presentation status to processing', { presentationId });
      await storage.updatePresentation(presentationId, {
        processingStatus: 'processing'
      });

      this.updateProgress(presentationId, {
        step: 'transcription',
        progress: 10,
        message: 'Transcribing audio...'
      });

      // Step 2: Transcribe audio with Whisper
      logger.info('Starting audio transcription', { presentationId, filename });
      const transcription = await this.transcribeAudio(audioBuffer, filename);
      
      logger.info('Transcription completed', { 
        presentationId, 
        transcriptLength: transcription.text?.length || 0,
        hasSegments: !!transcription.segments
      });
      
      if (!transcription.text || transcription.text.trim().length < 50) {
        const error = 'Transcription too short or empty. Please ensure audio contains clear speech.';
        logger.error(error, { presentationId, transcriptLength: transcription.text?.length || 0 });
        throw new Error(error);
      }

      this.updateProgress(presentationId, {
        step: 'analysis',
        progress: 40,
        message: 'Analyzing content...'
      });

      // Step 3: Analyze content and generate slide structure
      logger.info('Starting slide structure generation', { presentationId });
      const structure = await gpt4Service.generateSlideStructure(transcription.text);

      logger.info('Slide structure generated', { 
        presentationId, 
        slideCount: structure.slides.length,
        title: structure.title
      });

      this.updateProgress(presentationId, {
        step: 'generation',
        progress: 70,
        message: 'Generating slides...'
      });

      // Step 4: Apply theme and options
      structure.theme = options.theme || 'corporate';

      // Step 5: Skip content optimization to avoid API issues for now
      logger.info('Skipping content optimization to avoid API issues', { presentationId });
      // if (options.optimizeContent) {
      //   logger.info('Starting content optimization', { presentationId });
      //   structure.slides = await gpt4Service.optimizeContent(structure.slides);
      //   logger.info('Content optimization completed', { presentationId });
      // }

      // Step 6: Ensure minimum slide count
      if (options.targetSlideCount && structure.slides.length < options.targetSlideCount) {
        logger.info('Expanding slides to meet target count', { 
          presentationId, 
          currentCount: structure.slides.length,
          targetCount: options.targetSlideCount
        });
        structure.slides = await this.expandSlides(structure.slides, options.targetSlideCount);
      }

      this.updateProgress(presentationId, {
        step: 'bundling',
        progress: 90,
        message: 'Finalizing presentation...'
      });

      // Step 7: Update database with results
      logger.info('Updating presentation with generated content', { presentationId });
      const updatedPresentation = await storage.updatePresentation(presentationId, {
        transcript: transcription.text,
        slides: structure.slides,
        theme: structure.theme,
        processingStatus: 'completed'
      });

      // Step 8: Generate and save HTML bundle
      if (updatedPresentation) {
        logger.info('Generating HTML bundle', { presentationId });
        try {
          const htmlPath = await htmlBundler.savePresentation(updatedPresentation, {
            theme: structure.theme as any,
            includeNotes: true,
            standalone: true
          });
          
          // Update with HTML bundle path
          await storage.updatePresentation(presentationId, {
            htmlBundle: htmlPath
          });
          
          logger.info('HTML bundle generated and saved', { 
            presentationId,
            htmlPath
          });
        } catch (bundleError) {
          logger.error('Failed to generate HTML bundle', {
            presentationId,
            error: bundleError instanceof Error ? bundleError.message : 'Unknown error'
          });
          // Continue without failing the whole process
        }
      }

      this.updateProgress(presentationId, {
        step: 'complete',
        progress: 100,
        message: 'Presentation generated successfully!'
      });

      logger.info('Presentation generation completed successfully', { 
        presentationId,
        finalSlideCount: structure.slides.length
      });

      return structure;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Slide generation failed', { 
        presentationId, 
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Update database with error status
      await storage.updatePresentation(presentationId, {
        processingStatus: 'failed'
      });

      this.updateProgress(presentationId, {
        step: 'upload',
        progress: 0,
        message: 'Generation failed',
        error: errorMessage
      });

      throw error;
    }
  }

  private async transcribeAudio(audioBuffer: Buffer, filename: string): Promise<WhisperTranscription> {
    try {
      const preprocessedAudio = await whisperService.preprocessAudio(audioBuffer, filename);
      
      return await whisperService.transcribeAudio(preprocessedAudio, filename, {
        response_format: 'verbose_json',
        timestamp_granularities: ['word', 'segment']
      });
    } catch (error) {
      throw new Error(`Audio transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async expandSlides(slides: SlideContent[], targetCount: number): Promise<SlideContent[]> {
    if (slides.length >= targetCount) {
      return slides;
    }

    const expandedSlides = [...slides];
    
    // Find content slides that can be split
    const contentSlides = slides.filter(slide => 
      slide.type === 'content' && slide.content.length > 200
    );

    for (const slide of contentSlides) {
      if (expandedSlides.length >= targetCount) break;

      // Split long content slides
      const contentParts = this.splitSlideContent(slide.content);
      if (contentParts.length > 1) {
        // Replace original slide with split versions
        const slideIndex = expandedSlides.findIndex(s => s.id === slide.id);
        if (slideIndex !== -1) {
          expandedSlides.splice(slideIndex, 1);
          
          contentParts.forEach((part, index) => {
            expandedSlides.splice(slideIndex + index, 0, {
              ...slide,
              id: `${slide.id}-${index + 1}`,
              title: index === 0 ? slide.title : `${slide.title} (continued)`,
              content: part,
              speakerNotes: index === 0 ? slide.speakerNotes : `Continuation: ${part.substring(0, 100)}...`
            });
          });
        }
      }
    }

    return expandedSlides.slice(0, targetCount);
  }

  private splitSlideContent(content: string): string[] {
    // Split content by bullet points or paragraphs
    const parts = content.split(/(?:\n\s*[•·*-]\s*|\n\n+)/);
    
    if (parts.length <= 1) return [content];

    const result: string[] = [];
    let currentPart = '';

    for (const part of parts) {
      if (currentPart.length + part.length > 150) {
        if (currentPart) {
          result.push(currentPart.trim());
          currentPart = part;
        } else {
          result.push(part);
        }
      } else {
        currentPart += (currentPart ? '\n• ' : '• ') + part;
      }
    }

    if (currentPart) {
      result.push(currentPart.trim());
    }

    return result.length > 1 ? result : [content];
  }

  async validateAudioInput(file: Express.Multer.File): Promise<{ valid: boolean; error?: string }> {
    return whisperService.validateAudioFile(file);
  }

  async getProcessingStatus(presentationId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    presentation?: Presentation;
  }> {
    const presentation = await storage.getPresentation(presentationId);
    
    if (!presentation) {
      return { status: 'failed' };
    }

    return {
      status: presentation.processingStatus || 'pending',
      presentation
    };
  }

  async regenerateSlides(
    presentationId: string,
    options: SlideGenerationOptions = {}
  ): Promise<PresentationStructure> {
    const presentation = await storage.getPresentation(presentationId);
    
    if (!presentation || !presentation.transcript) {
      throw new Error('Presentation not found or missing transcript');
    }

    this.updateProgress(presentationId, {
      step: 'analysis',
      progress: 20,
      message: 'Regenerating slides...'
    });

    const structure = await gpt4Service.generateSlideStructure(presentation.transcript);
    structure.theme = options.theme || presentation.theme || 'corporate';

    if (options.optimizeContent) {
      structure.slides = await gpt4Service.optimizeContent(structure.slides);
    }

    await storage.updatePresentation(presentationId, {
      slides: structure.slides,
      theme: structure.theme,
      processingStatus: 'completed'
    });

    this.updateProgress(presentationId, {
      step: 'complete',
      progress: 100,
      message: 'Slides regenerated successfully!'
    });

    return structure;
  }
}

export const slideGenerator = new SlideGeneratorService();