import { useState } from 'react';
import { AudioInput } from '@/components/AudioInput';
import { ProcessingStatus } from '@/components/ProcessingStatus';
import { SlidePreview } from '@/components/SlidePreview';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Presentation, Mic, Sparkles, Download, RefreshCw, AlertCircle } from "lucide-react";

interface SlideContent {
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

type AppState = 'input' | 'processing' | 'preview' | 'error';

export default function Home() {
  const [appState, setAppState] = useState<AppState>('input');
  const [currentPresentation, setCurrentPresentation] = useState<{
    id: string;
    title: string;
    slides: SlideContent[];
    theme: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAudioUpload = async (file: File, title: string) => {
    try {
      setError(null);
      
      // Step 1: Create presentation
      const createResponse = await fetch('/api/presentations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, theme: 'corporate' }),
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create presentation');
      }

      const { presentation } = await createResponse.json();
      
      // Step 2: Upload audio file
      const formData = new FormData();
      formData.append('audio', file);

      const uploadResponse = await fetch(`/api/presentations/${presentation.id}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      setCurrentPresentation({
        id: presentation.id,
        title: presentation.title,
        slides: [],
        theme: presentation.theme || 'corporate'
      });
      setAppState('processing');

    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setAppState('error');
    }
  };

  const handleProcessingComplete = async (presentationId: string) => {
    try {
      const response = await fetch(`/api/presentations/${presentationId}`);
      if (!response.ok) {
        throw new Error('Failed to get presentation');
      }

      const { presentation } = await response.json();
      
      setCurrentPresentation({
        id: presentation.id,
        title: presentation.title,
        slides: presentation.slides || [],
        theme: presentation.theme || 'corporate'
      });
      setAppState('preview');
    } catch (err) {
      console.error('Failed to load presentation:', err);
      setError('Failed to load completed presentation');
      setAppState('error');
    }
  };

  const handleProcessingError = (errorMessage: string) => {
    setError(errorMessage);
    setAppState('error');
  };

  const handleSlidesUpdate = async (slides: SlideContent[]) => {
    if (!currentPresentation) return;

    try {
      const response = await fetch(`/api/presentations/${currentPresentation.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slides }),
      });

      if (!response.ok) {
        throw new Error('Failed to update slides');
      }

      setCurrentPresentation(prev => prev ? { ...prev, slides } : null);
    } catch (err) {
      console.error('Failed to update slides:', err);
      setError('Failed to save slide changes');
    }
  };

  const handleThemeChange = async (theme: string) => {
    if (!currentPresentation) return;

    try {
      const response = await fetch(`/api/presentations/${currentPresentation.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ theme }),
      });

      if (!response.ok) {
        throw new Error('Failed to update theme');
      }

      setCurrentPresentation(prev => prev ? { ...prev, theme } : null);
    } catch (err) {
      console.error('Failed to update theme:', err);
      setError('Failed to change theme');
    }
  };

  const handleRetry = () => {
    setError(null);
    setCurrentPresentation(null);
    setAppState('input');
  };

  const startOver = () => {
    setError(null);
    setCurrentPresentation(null);
    setAppState('input');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Presentation className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Voice to Slides</h1>
                <p className="text-sm text-slate-600">Transform your speech into professional presentations</p>
              </div>
            </div>
            
            {currentPresentation && (
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  {currentPresentation.slides.length} slides
                </Badge>
                <Button variant="outline" size="sm" onClick={startOver}>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  New
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center space-y-8">
          
          {/* Progress Indicator */}
          {appState !== 'input' && (
            <div className="w-full max-w-2xl">
              <div className="flex items-center justify-center space-x-4 mb-6">
                <div className={`flex items-center space-x-2 ${
                  appState === 'processing' ? 'text-blue-600' : 'text-green-600'
                }`}>
                  <Mic className="w-4 h-4" />
                  <span className="text-sm font-medium">Audio Uploaded</span>
                </div>
                <div className="w-8 h-px bg-slate-300"></div>
                <div className={`flex items-center space-x-2 ${
                  appState === 'processing' ? 'text-blue-600' : 
                  appState === 'preview' ? 'text-green-600' : 'text-slate-400'
                }`}>
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-medium">Processing</span>
                </div>
                <div className="w-8 h-px bg-slate-300"></div>
                <div className={`flex items-center space-x-2 ${
                  appState === 'preview' ? 'text-green-600' : 'text-slate-400'
                }`}>
                  <Presentation className="w-4 h-4" />
                  <span className="text-sm font-medium">Preview</span>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {appState === 'error' && (
            <Alert variant="destructive" className="max-w-2xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <Button variant="outline" size="sm" onClick={handleRetry} className="ml-4">
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Input State */}
          {appState === 'input' && (
            <div className="w-full max-w-4xl space-y-8">
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold text-slate-900">
                  Create Your Presentation
                </h2>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                  Upload an audio file or record directly to generate a professional slide deck. 
                  Our AI will analyze your speech and create structured, engaging slides.
                </p>
              </div>
              
              <AudioInput
                onAudioUpload={handleAudioUpload}
                isProcessing={false}
              />

              {/* Feature Highlights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                <Card className="text-center">
                  <CardContent className="pt-6">
                    <Mic className="w-8 h-8 text-blue-600 mx-auto mb-4" />
                    <CardTitle className="text-lg">Smart Transcription</CardTitle>
                    <CardDescription className="mt-2">
                      Advanced speech recognition with noise cancellation and speaker detection
                    </CardDescription>
                  </CardContent>
                </Card>
                
                <Card className="text-center">
                  <CardContent className="pt-6">
                    <Sparkles className="w-8 h-8 text-green-600 mx-auto mb-4" />
                    <CardTitle className="text-lg">AI-Powered Analysis</CardTitle>
                    <CardDescription className="mt-2">
                      Intelligent content structuring with automatic slide generation and speaker notes
                    </CardDescription>
                  </CardContent>
                </Card>
                
                <Card className="text-center">
                  <CardContent className="pt-6">
                    <Download className="w-8 h-8 text-purple-600 mx-auto mb-4" />
                    <CardTitle className="text-lg">Export Ready</CardTitle>
                    <CardDescription className="mt-2">
                      Self-contained HTML presentations that work offline, anywhere
                    </CardDescription>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Processing State */}
          {appState === 'processing' && currentPresentation && (
            <ProcessingStatus
              presentationId={currentPresentation.id}
              onComplete={handleProcessingComplete}
              onError={handleProcessingError}
              onRetry={handleRetry}
            />
          )}

          {/* Preview State */}
          {appState === 'preview' && currentPresentation && (
            <div className="w-full space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  {currentPresentation.title}
                </h2>
                <p className="text-slate-600">
                  Your presentation is ready! Review and customize as needed.
                </p>
              </div>

              <SlidePreview
                slides={currentPresentation.slides}
                theme={currentPresentation.theme}
                onSlidesUpdate={handleSlidesUpdate}
                onThemeChange={handleThemeChange}
                isEditable={true}
              />

              <div className="flex justify-center space-x-4">
                <Button size="lg" onClick={async () => {
                  if (currentPresentation?.id) {
                    try {
                      const response = await fetch(`/api/presentations/${currentPresentation.id}?download=true`);
                      const data = await response.json();
                      
                      if (data.success && data.content) {
                        // Create blob and download
                        const blob = new Blob([data.content], { type: 'text/html' });
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = data.filename || 'presentation.html';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                      } else {
                        console.error('Download failed:', data.error);
                      }
                    } catch (error) {
                      console.error('Download error:', error);
                    }
                  }
                }}>
                  <Download className="w-4 h-4 mr-2" />
                  Download HTML
                </Button>
                <Button variant="outline" size="lg" onClick={startOver}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Create Another
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-slate-600">
            <p>Powered by OpenAI GPT-4 and Whisper • Enterprise-grade presentation generation</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
