import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Mic, 
  Brain, 
  Presentation, 
  Package,
  RefreshCw 
} from 'lucide-react';

interface ProcessingStep {
  step: 'upload' | 'transcription' | 'analysis' | 'generation' | 'bundling' | 'complete';
  progress: number;
  message: string;
  error?: string;
}

interface ProcessingStatusProps {
  presentationId: string;
  onComplete?: (presentationId: string) => void;
  onError?: (error: string) => void;
  onRetry?: () => void;
}

const STEP_CONFIG = {
  upload: { 
    icon: Clock, 
    label: 'Upload', 
    description: 'Preparing audio file...' 
  },
  transcription: { 
    icon: Mic, 
    label: 'Transcription', 
    description: 'Converting speech to text...' 
  },
  analysis: { 
    icon: Brain, 
    label: 'Analysis', 
    description: 'Analyzing content structure...' 
  },
  generation: { 
    icon: Presentation, 
    label: 'Generation', 
    description: 'Creating slide content...' 
  },
  bundling: { 
    icon: Package, 
    label: 'Bundling', 
    description: 'Finalizing presentation...' 
  },
  complete: { 
    icon: CheckCircle, 
    label: 'Complete', 
    description: 'Presentation ready!' 
  }
};

const STEP_ORDER = ['upload', 'transcription', 'analysis', 'generation', 'bundling', 'complete'] as const;

export function ProcessingStatus({ 
  presentationId, 
  onComplete, 
  onError,
  onRetry 
}: ProcessingStatusProps) {
  const [currentStep, setCurrentStep] = useState<ProcessingStep>({
    step: 'upload',
    progress: 0,
    message: 'Starting processing...'
  });
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPolling && currentStep.step !== 'complete' && !currentStep.error) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPolling, currentStep.step, currentStep.error]);

  useEffect(() => {
    if (!isPolling) return;

    // Safety timeout - stop polling after 2 minutes
    const safetyTimeout = setTimeout(() => {
      console.log('⚠️ Processing timeout after 2 minutes, stopping polls');
      setIsPolling(false);
      setCurrentStep({
        step: 'upload',
        progress: 0,
        error: 'Processing timeout - please try again',
        message: 'Processing took too long and was stopped'
      });
      onError?.('Processing timeout');
    }, 120000); // 2 minutes

    const pollStatus = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(`/api/presentations/${presentationId}/status`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          throw new Error('Failed to fetch status');
        }

        const data = await response.json();
        
        if (data.error) {
          setCurrentStep(prev => ({
            ...prev,
            error: data.error
          }));
          setIsPolling(false);
          onError?.(data.error);
          return;
        }

        // Handle the actual API response format
        if (data.status === 'completed') {
          setCurrentStep({
            step: 'complete',
            progress: 100,
            message: 'Presentation generated successfully!'
          });
          setIsPolling(false);
          setTimeout(() => {
            onComplete?.(presentationId);
          }, 1000);
        } else if (data.status === 'processing') {
          // Update based on processing status - estimate progress
          const elapsedMinutes = Math.floor(elapsedTime / 60);
          if (elapsedTime < 20) {
            setCurrentStep({
              step: 'transcription',
              progress: Math.min(50, (elapsedTime / 20) * 50),
              message: 'Converting speech to text...'
            });
          } else {
            setCurrentStep({
              step: 'analysis',
              progress: Math.min(90, 50 + ((elapsedTime - 20) / 20) * 40),
              message: 'Analyzing content structure...'
            });
          }
        } else if (data.status === 'failed') {
          setCurrentStep(prev => ({
            ...prev,
            error: 'Processing failed'
          }));
          setIsPolling(false);
          onError?.('Processing failed');
        }
        
        // Legacy support for old format
        if (data.progress) {
          setCurrentStep(data.progress);
          
          if (data.progress.step === 'complete') {
            setIsPolling(false);
            setTimeout(() => {
              onComplete?.(presentationId);
            }, 1000);
          }
        }
      } catch (error) {
        console.error('Status polling error:', error);
        const isAbortError = error instanceof Error && error.name === 'AbortError';
        const errorMessage = isAbortError ? 'Request timeout' : 'Failed to get processing status';
        
        setCurrentStep(prev => ({
          ...prev,
          error: errorMessage
        }));
        setIsPolling(false);
        onError?.(errorMessage);
      }
    };

    // Poll immediately, then every 2 seconds
    pollStatus();
    const interval = setInterval(pollStatus, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(safetyTimeout);
    };
  }, [presentationId, isPolling, onComplete, onError]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStepStatus = (stepName: typeof STEP_ORDER[number]) => {
    const currentIndex = STEP_ORDER.indexOf(currentStep.step);
    const stepIndex = STEP_ORDER.indexOf(stepName);
    
    if (currentStep.error && stepName === currentStep.step) {
      return 'error';
    } else if (stepIndex < currentIndex) {
      return 'completed';
    } else if (stepIndex === currentIndex) {
      return 'current';
    } else {
      return 'pending';
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {currentStep.error ? (
                <XCircle className="w-5 h-5 text-red-500" />
              ) : currentStep.step === 'complete' ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <Loader2 className="w-5 h-5 animate-spin" />
              )}
              Processing Status
            </CardTitle>
            <CardDescription>
              {currentStep.error ? 'Processing failed' : currentStep.message}
            </CardDescription>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-mono">
              {formatTime(elapsedTime)}
            </div>
            <div className="text-xs text-muted-foreground">
              Elapsed time
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {currentStep.error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{currentStep.error}</span>
              {onRetry && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onRetry}
                  className="ml-2"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Retry
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">
              {Math.round(currentStep.progress)}%
            </span>
          </div>
          
          <Progress 
            value={currentStep.progress} 
            className={`h-2 ${currentStep.error ? 'bg-red-100' : ''}`}
          />
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium">Processing Steps</h4>
          
          {STEP_ORDER.map((stepName) => {
            const config = STEP_CONFIG[stepName];
            const status = getStepStatus(stepName);
            const Icon = config.icon;
            
            return (
              <div
                key={stepName}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  status === 'current' 
                    ? 'bg-blue-50 border border-blue-200' 
                    : status === 'completed'
                    ? 'bg-green-50 border border-green-200'
                    : status === 'error'
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className={`p-2 rounded-full ${
                  status === 'current'
                    ? 'bg-blue-100 text-blue-600'
                    : status === 'completed'
                    ? 'bg-green-100 text-green-600'
                    : status === 'error'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {status === 'current' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{config.label}</span>
                    <Badge 
                      variant={
                        status === 'completed' 
                          ? 'default' 
                          : status === 'current'
                          ? 'secondary'
                          : status === 'error'
                          ? 'destructive'
                          : 'outline'
                      }
                      className="text-xs"
                    >
                      {status === 'completed' 
                        ? 'Done' 
                        : status === 'current'
                        ? 'In Progress'
                        : status === 'error'
                        ? 'Failed'
                        : 'Pending'
                      }
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {status === 'current' ? currentStep.message : config.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {currentStep.step === 'complete' && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Your presentation has been generated successfully! You can now view and download it.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}