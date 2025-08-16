import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';
import type { Presentation } from '@shared/schema';

export interface BundleOptions {
  theme?: 'corporate' | 'dark' | 'light';
  includeNotes?: boolean;
  standalone?: boolean;
}

export class HtmlBundlerService {
  private outputDir: string;

  constructor() {
    this.outputDir = path.join(process.cwd(), 'outputs', 'presentations');
    this.ensureOutputDir();
  }

  private ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      logger.info('Created presentations output directory', { path: this.outputDir });
    }
  }

  private getThemeStyles(theme: string = 'corporate'): string {
    const themes = {
      corporate: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        slideBackground: 'rgba(255, 255, 255, 0.95)',
        primary: '#4f46e5',
        secondary: '#7c3aed',
        accent: '#f59e0b',
        text: '#1f2937',
        textLight: '#6b7280',
        success: '#059669'
      },
      dark: {
        background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
        slideBackground: 'rgba(31, 41, 55, 0.95)',
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        accent: '#f59e0b',
        text: '#f9fafb',
        textLight: '#d1d5db',
        success: '#10b981'
      },
      light: {
        background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        slideBackground: 'rgba(255, 255, 255, 0.9)',
        primary: '#2563eb',
        secondary: '#7c2d12',
        accent: '#dc2626',
        text: '#111827',
        textLight: '#4b5563',
        success: '#16a34a'
      }
    };

    const colors = themes[theme as keyof typeof themes] || themes.corporate;

    return `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
      
      * {
        box-sizing: border-box;
      }
      
      body { 
        font-family: 'Inter', system-ui, -apple-system, sans-serif; 
        margin: 0; 
        background: ${colors.background};
        color: ${colors.text};
        line-height: 1.6;
        overflow-x: hidden;
      }
      
      .presentation { 
        max-width: 1000px; 
        margin: 0 auto; 
        padding: 40px 20px; 
      }
      
      .slide { 
        background: ${colors.slideBackground};
        backdrop-filter: blur(20px);
        margin: 40px 0; 
        padding: 60px; 
        border-radius: 20px; 
        box-shadow: 0 25px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1); 
        page-break-after: always;
        min-height: 500px;
        display: flex;
        flex-direction: column;
        position: relative;
        overflow: hidden;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
      }
      
      .slide:hover {
        transform: translateY(-5px);
        box-shadow: 0 35px 70px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.2);
      }
      
      .slide::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, ${colors.primary}, ${colors.secondary}, ${colors.accent});
      }
      
      .slide-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 40px;
        z-index: 2;
      }
      
      .slide-number { 
        background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary});
        color: white; 
        padding: 12px 20px; 
        border-radius: 30px; 
        font-size: 14px; 
        font-weight: 600;
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        position: relative;
        overflow: hidden;
      }
      
      .slide-number::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
        transition: left 0.5s;
      }
      
      .slide-number:hover::before {
        left: 100%;
      }
      
      .slide-type { 
        background: linear-gradient(135deg, ${colors.accent}, ${colors.secondary});
        color: white; 
        padding: 8px 16px; 
        border-radius: 25px; 
        font-size: 12px; 
        text-transform: uppercase;
        font-weight: 500;
        letter-spacing: 0.5px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      }
      
      .slide-title { 
        font-size: 42px; 
        font-weight: 800; 
        color: ${colors.text}; 
        margin-bottom: 30px; 
        background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary});
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        position: relative;
        flex-shrink: 0;
        line-height: 1.2;
      }
      
      .slide-title::after {
        content: '';
        position: absolute;
        bottom: -10px;
        left: 0;
        width: 60px;
        height: 4px;
        background: linear-gradient(90deg, ${colors.primary}, ${colors.accent});
        border-radius: 2px;
      }
      
      .slide-content { 
        font-size: 22px; 
        line-height: 1.7; 
        color: ${colors.text}; 
        margin-bottom: 30px; 
        white-space: pre-line;
        flex-grow: 1;
        font-weight: 400;
      }
      
      .slide-content p {
        margin-bottom: 20px;
        text-align: justify;
      }
      
      .slide-content ul {
        padding-left: 0;
        list-style: none;
        margin: 20px 0;
      }
      
      .slide-content li {
        margin: 16px 0;
        padding: 12px 0 12px 40px;
        position: relative;
        border-radius: 8px;
        transition: all 0.2s ease;
      }
      
      .slide-content li:hover {
        background: rgba(0,0,0,0.03);
        padding-left: 45px;
      }
      
      .slide-content li:before {
        content: '▶';
        color: ${colors.primary};
        position: absolute;
        left: 12px;
        top: 12px;
        font-size: 16px;
        transition: transform 0.2s ease;
      }
      
      .slide-content li:hover:before {
        transform: scale(1.2);
      }
      
      .speaker-notes { 
        background: linear-gradient(135deg, rgba(0,0,0,0.05), rgba(0,0,0,0.08));
        backdrop-filter: blur(10px);
        padding: 25px; 
        border-radius: 15px; 
        font-size: 16px; 
        color: ${colors.textLight}; 
        border-left: 6px solid ${colors.primary};
        margin-top: auto;
        flex-shrink: 0;
        position: relative;
        font-style: italic;
      }
      
      .speaker-notes::before {
        content: '💭';
        font-size: 20px;
        margin-right: 8px;
      }
      
      .presentation-header { 
        text-align: center; 
        margin-bottom: 60px; 
        padding: 80px 40px;
        background: ${colors.slideBackground};
        backdrop-filter: blur(20px);
        border-radius: 25px;
        box-shadow: 0 30px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1);
        position: relative;
        overflow: hidden;
      }
      
      .presentation-header::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle, ${colors.primary}15 0%, transparent 70%);
        animation: rotate 20s linear infinite;
        z-index: 0;
      }
      
      .presentation-header > * {
        position: relative;
        z-index: 1;
      }
      
      @keyframes rotate {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .presentation-header h1 { 
        font-size: 54px; 
        background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary}, ${colors.accent});
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin-bottom: 20px;
        font-weight: 800;
        line-height: 1.2;
      }
      
      .presentation-header .subtitle { 
        color: ${colors.textLight}; 
        font-size: 20px;
        font-weight: 500;
        letter-spacing: 0.5px;
      }
      
      .presentation-footer {
        text-align: center; 
        margin-top: 60px; 
        padding: 40px; 
        background: ${colors.slideBackground};
        backdrop-filter: blur(20px);
        border-radius: 20px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        color: ${colors.textLight};
        font-size: 16px;
      }
      
      .presentation-footer p {
        margin: 8px 0;
        display: inline-block;
        padding: 8px 16px;
        background: rgba(0,0,0,0.05);
        border-radius: 20px;
        margin: 4px 8px;
      }
      
      @media print {
        .slide { 
          box-shadow: none; 
          border: 2px solid ${colors.primary}; 
          background: white;
        }
        .presentation { padding: 0; }
        .slide::before { display: none; }
        .presentation-header::before { display: none; }
      }
      
      @media (max-width: 768px) {
        .presentation { padding: 20px 15px; }
        .slide { 
          padding: 40px 30px; 
          margin: 25px 0; 
        }
        .slide-title { font-size: 32px; }
        .slide-content { font-size: 18px; }
        .presentation-header { padding: 50px 30px; }
        .presentation-header h1 { font-size: 36px; }
      }
      
      /* Chart styles */
      .chart-container {
        margin: 30px 0;
        padding: 30px;
        background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
        border-radius: 15px;
        border: 1px solid rgba(255,255,255,0.1);
      }
      
      .chart-title {
        font-size: 20px;
        font-weight: 600;
        color: ${colors.text};
        text-align: center;
        margin-bottom: 25px;
      }
      
      .chart-bar {
        display: flex;
        align-items: center;
        margin: 15px 0;
        font-size: 16px;
        font-weight: 500;
      }
      
      .chart-label {
        min-width: 180px;
        color: ${colors.text};
      }
      
      .chart-bar-bg {
        flex: 1;
        height: 30px;
        background: rgba(0,0,0,0.1);
        border-radius: 15px;
        margin: 0 15px;
        position: relative;
        overflow: hidden;
      }
      
      .chart-bar-fill {
        height: 100%;
        border-radius: 15px;
        background: linear-gradient(90deg, ${colors.primary}, ${colors.secondary});
        transition: width 2s ease-in-out;
        position: relative;
        min-width: 20px;
      }
      
      .chart-bar-fill::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
        animation: shimmer 2s infinite;
      }
      
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      
      .chart-value {
        color: ${colors.text};
        font-weight: 600;
        min-width: 50px;
        text-align: right;
      }
    `;
  }

  generateHtmlPresentation(presentation: Presentation, options: BundleOptions = {}): string {
    const theme = options.theme || presentation.theme || 'corporate';
    const includeNotes = options.includeNotes !== false; // Default true
    const slides = presentation.slides || [];

    // Convert content to proper HTML with bullet points
    const formatContent = (content: string): string => {
      return content
        .split('\n')
        .map(line => {
          const trimmed = line.trim();
          if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
            return `<li>${trimmed.substring(2)}</li>`;
          } else if (trimmed) {
            return `<p>${trimmed}</p>`;
          }
          return '';
        })
        .filter(line => line)
        .join('\n');
    };

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${presentation.title}</title>
    <style>
        ${this.getThemeStyles(theme)}
    </style>
</head>
<body>
    <div class="presentation">
        <div class="presentation-header">
            <h1>${presentation.title}</h1>
            <div class="subtitle">
                AI-Generated Presentation • ${slides.length} slides • ${new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
            </div>
        </div>
        
        ${slides.map((slide, index) => `
        <div class="slide">
            <div class="slide-header">
                <div class="slide-number">Slide ${index + 1} of ${slides.length}</div>
                <div class="slide-type">${slide.type}</div>
            </div>
            <div class="slide-title">${slide.title}</div>
            <div class="slide-content">
                ${formatContent(slide.content)}
            </div>
            ${includeNotes && slide.speakerNotes ? `
                <div class="speaker-notes">
                    <strong>💭 Speaker Notes:</strong><br>
                    ${slide.speakerNotes}
                </div>
            ` : ''}
        </div>
        `).join('')}
        
        <div class="presentation-footer">
            <p>📊 Generated from ${presentation.transcript?.length || 0} characters of audio transcript</p>
            <p>🤖 Powered by OpenAI Whisper + GPT-4 • Theme: ${theme}</p>
            <p>📅 Generated on ${new Date().toLocaleString()}</p>
        </div>
    </div>

    <script>
        // Add keyboard navigation
        let currentSlide = 0;
        const slides = document.querySelectorAll('.slide');
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' && currentSlide < slides.length - 1) {
                currentSlide++;
                slides[currentSlide].scrollIntoView({ behavior: 'smooth' });
            } else if (e.key === 'ArrowLeft' && currentSlide > 0) {
                currentSlide--;
                slides[currentSlide].scrollIntoView({ behavior: 'smooth' });
            }
        });

        // Auto-scroll on mouse wheel
        let isScrolling = false;
        document.addEventListener('wheel', (e) => {
            if (isScrolling) return;
            isScrolling = true;
            setTimeout(() => isScrolling = false, 500);
            
            if (e.deltaY > 0 && currentSlide < slides.length - 1) {
                currentSlide++;
                slides[currentSlide].scrollIntoView({ behavior: 'smooth' });
            } else if (e.deltaY < 0 && currentSlide > 0) {
                currentSlide--;
                slides[currentSlide].scrollIntoView({ behavior: 'smooth' });
            }
        });

        console.log('🎯 Presentation loaded with ${slides.length} slides');
        console.log('📱 Use arrow keys or scroll to navigate');
    </script>
</body>
</html>`;

    return html;
  }

  async savePresentation(presentation: Presentation, options: BundleOptions = {}): Promise<string> {
    logger.info('Generating HTML presentation', { 
      presentationId: presentation.id,
      title: presentation.title,
      slideCount: presentation.slides?.length || 0,
      options
    });

    try {
      const html = this.generateHtmlPresentation(presentation, options);
      
      // Create safe filename
      const title = presentation.title || 'untitled_presentation';
      const safeTitle = title
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .toLowerCase();
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${safeTitle}_${timestamp}.html`;
      const filepath = path.join(this.outputDir, filename);

      // Save HTML file
      fs.writeFileSync(filepath, html, 'utf8');

      // Also save JSON data for backup
      const jsonFilename = `${safeTitle}_${timestamp}_data.json`;
      const jsonFilepath = path.join(this.outputDir, jsonFilename);
      fs.writeFileSync(jsonFilepath, JSON.stringify({
        presentation,
        generatedAt: new Date().toISOString(),
        options
      }, null, 2), 'utf8');

      logger.info('Presentation saved successfully', {
        presentationId: presentation.id,
        htmlFile: filepath,
        jsonFile: jsonFilepath,
        fileSize: fs.statSync(filepath).size
      });

      return filepath;

    } catch (error) {
      logger.error('Failed to save presentation', {
        presentationId: presentation.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getAllPresentations(): Promise<string[]> {
    try {
      const files = fs.readdirSync(this.outputDir);
      return files.filter(file => file.endsWith('.html')).map(file => path.join(this.outputDir, file));
    } catch (error) {
      logger.warn('Could not list presentations', { error });
      return [];
    }
  }
}

export const htmlBundler = new HtmlBundlerService();