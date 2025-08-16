import { openai, OPENAI_CONFIG } from './config.js';
import { logger } from '../../utils/logger.js';

export interface SlideContent {
  id: string;
  title: string;
  content: string;
  speakerNotes: string;
  type: 'title' | 'content' | 'chart' | 'conclusion';
  chartData?: {
    type: 'bar' | 'line' | 'pie' | 'scatter';
    data: Array<{ label: string; value: number }>;
    title: string;
  };
}

export interface PresentationStructure {
  title: string;
  summary: string;
  keyTopics: string[];
  slides: SlideContent[];
  totalDuration: string;
  theme: string;
  targetAudience: string;
}

export class GPT4Service {
  private getSlideGenerationPrompt(): string {
    return `You are an expert presentation designer. Your task is to analyze a speech transcript and convert it into a professional slide deck structure.

Requirements:
- Generate exactly 5-7 slides minimum
- Create engaging, visual slide content
- Include detailed speaker notes for each slide  
- Identify opportunities for charts/data visualization
- Maintain professional tone and structure
- Each slide should have a clear purpose and message

Slide Types:
- title: Opening slide with main topic
- content: Main content slides with bullet points or key concepts
- chart: Data visualization slides with suggested chart types
- conclusion: Closing slide with key takeaways

Response Format (JSON):
{
  "title": "Presentation title",
  "summary": "Brief overview of the presentation content",
  "keyTopics": ["topic1", "topic2", "topic3"],
  "slides": [
    {
      "id": "slide-1",
      "title": "Slide title",
      "content": "Main slide content with bullet points or key message",
      "speakerNotes": "Detailed speaking notes with timing suggestions and additional context",
      "type": "title|content|chart|conclusion",
      "chartData": {
        "type": "bar|line|pie|scatter",
        "data": [{"label": "Label", "value": 100}],
        "title": "Chart title"
      } // Only include if type is "chart"
    }
  ],
  "totalDuration": "Estimated presentation time",
  "theme": "corporate",
  "targetAudience": "Identified target audience"
}

Guidelines:
- Make content engaging and professional
- Include specific talking points in speaker notes
- Suggest timing for each slide
- Identify data that could be visualized as charts
- Create clear, actionable conclusions
- Ensure logical flow between slides`;
  }

  private getContentOptimizationPrompt(): string {
    return `You are a presentation content optimizer. Review the provided slide content and enhance it for maximum impact and clarity.

Focus on:
- Clear, concise messaging
- Strong visual hierarchy
- Engaging bullet points
- Professional language
- Actionable insights
- Memorable conclusions

Maintain the original structure while improving readability and engagement. Return the optimized content in JSON format.`;
  }

  async generateSlideStructure(transcript: string): Promise<PresentationStructure> {
    logger.info('Starting GPT-4 slide structure generation', { 
      transcriptLength: transcript.length 
    });

    try {
      const completion = await openai.chat.completions.create({
        model: OPENAI_CONFIG.GPT_MODEL,
        messages: [
          {
            role: "system",
            content: this.getSlideGenerationPrompt()
          },
          {
            role: "user",
            content: `Please analyze this transcript and create a professional presentation structure:\n\n${transcript}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: OPENAI_CONFIG.TEMPERATURE,
        max_tokens: OPENAI_CONFIG.MAX_TOKENS
      });

      logger.info('GPT-4 API call completed', {
        model: OPENAI_CONFIG.GPT_MODEL,
        tokensUsed: completion.usage?.total_tokens || 0
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from GPT-4');
      }

      logger.debug('Parsing GPT-4 response', { responseLength: response.length });
      const structure = JSON.parse(response) as PresentationStructure;
      
      // Ensure minimum slide count
      if (structure.slides.length < 5) {
        logger.warn('Generated presentation has fewer than 5 slides', { 
          slideCount: structure.slides.length 
        });
        throw new Error('Generated presentation has fewer than 5 slides. Please try again.');
      }

      // Assign unique IDs if not present
      structure.slides.forEach((slide, index) => {
        if (!slide.id) {
          slide.id = `slide-${index + 1}`;
        }
      });

      logger.info('Slide structure generation completed', { 
        slideCount: structure.slides.length,
        title: structure.title
      });

      return structure;
    } catch (error) {
      logger.error('GPT-4 Slide Generation Error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`Slide generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async optimizeContent(slides: SlideContent[]): Promise<SlideContent[]> {
    try {
      const completion = await openai.chat.completions.create({
        model: OPENAI_CONFIG.GPT_MODEL,
        messages: [
          {
            role: "system",
            content: this.getContentOptimizationPrompt()
          },
          {
            role: "user",
            content: `Please optimize these slides for better engagement and clarity:\n\n${JSON.stringify(slides, null, 2)}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3, // Lower temperature for optimization
        max_tokens: OPENAI_CONFIG.MAX_TOKENS
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from GPT-4 optimization');
      }

      const optimized = JSON.parse(response);
      return optimized.slides || slides;
    } catch (error) {
      console.error('GPT-4 Content Optimization Error:', error);
      // Return original slides if optimization fails
      return slides;
    }
  }

  async generateSpeakerNotes(slideContent: string, context?: string): Promise<string> {
    try {
      const completion = await openai.chat.completions.create({
        model: OPENAI_CONFIG.GPT_MODEL,
        messages: [
          {
            role: "system",
            content: "Generate detailed speaker notes for this slide content. Include timing suggestions, transition phrases, and additional context that would help a presenter deliver this content effectively."
          },
          {
            role: "user",
            content: `Slide content: ${slideContent}\n\nContext: ${context || 'General presentation'}`
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      return completion.choices[0]?.message?.content || "No speaker notes generated";
    } catch (error) {
      console.error('Speaker Notes Generation Error:', error);
      return "Speaker notes could not be generated for this slide.";
    }
  }

  async analyzeTranscriptTopics(transcript: string): Promise<{
    mainTopics: string[];
    keyInsights: string[];
    suggestedCharts: Array<{
      title: string;
      type: string;
      description: string;
    }>;
  }> {
    try {
      const completion = await openai.chat.completions.create({
        model: OPENAI_CONFIG.GPT_MODEL,
        messages: [
          {
            role: "system",
            content: "Analyze this transcript and identify main topics, key insights, and opportunities for data visualization. Return the results in JSON format."
          },
          {
            role: "user",
            content: transcript
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
        max_tokens: 1000
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        return {
          mainTopics: [],
          keyInsights: [],
          suggestedCharts: []
        };
      }

      return JSON.parse(response);
    } catch (error) {
      console.error('Transcript Analysis Error:', error);
      return {
        mainTopics: ['Analysis failed'],
        keyInsights: ['Could not extract insights'],
        suggestedCharts: []
      };
    }
  }
}

export const gpt4Service = new GPT4Service();