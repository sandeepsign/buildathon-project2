import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, MicOff, Upload, Trash2, Play, Pause } from 'lucide-react';

interface AudioInputProps {
  onAudioUpload: (file: File, title: string) => void;
  isProcessing?: boolean;
}

export function AudioInput({ onAudioUpload, isProcessing = false }: AudioInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [presentationTitle, setPresentationTitle] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setRecordedBlob(blob);
        setUploadedFile(null);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      
      intervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      setError('Failed to access microphone. Please check permissions.');
      console.error('Error starting recording:', err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [isRecording]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = ['audio/mp3', 'audio/wav', 'audio/m4a', 'audio/mpeg', 'audio/webm'];
      if (!validTypes.some(type => file.type.includes(type.split('/')[1]))) {
        setError('Please upload a valid audio file (MP3, WAV, M4A)');
        return;
      }
      
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        setError('File size must be under 50MB');
        return;
      }
      
      setError(null);
      setUploadedFile(file);
      setRecordedBlob(null);
      
      if (!presentationTitle) {
        setPresentationTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const playAudio = useCallback(() => {
    const audioBlob = recordedBlob || uploadedFile;
    if (!audioBlob) return;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(URL.createObjectURL(audioBlob));
    audioRef.current = audio;
    
    audio.onplay = () => setIsPlaying(true);
    audio.onpause = () => setIsPlaying(false);
    audio.onended = () => setIsPlaying(false);
    
    audio.play().catch(err => {
      console.error('Error playing audio:', err);
      setError('Failed to play audio');
    });
  }, [recordedBlob, uploadedFile]);

  const pauseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const clearAudio = useCallback(() => {
    setRecordedBlob(null);
    setUploadedFile(null);
    setRecordingDuration(0);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleSubmit = useCallback(() => {
    if (!presentationTitle.trim()) {
      setError('Please enter a presentation title');
      return;
    }

    const audioFile = recordedBlob || uploadedFile;
    if (!audioFile) {
      setError('Please upload an audio file or record audio');
      return;
    }

    let file: File;
    if (recordedBlob) {
      file = new File([recordedBlob], `${presentationTitle}.webm`, { 
        type: 'audio/webm' 
      });
    } else if (uploadedFile) {
      file = uploadedFile;
    } else {
      return;
    }

    onAudioUpload(file, presentationTitle);
  }, [recordedBlob, uploadedFile, presentationTitle, onAudioUpload]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const hasAudio = recordedBlob || uploadedFile;

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="w-5 h-5" />
          Audio Input
        </CardTitle>
        <CardDescription>
          Upload an audio file or record directly. Supports MP3, WAV, and M4A formats up to 50MB.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Presentation Title</Label>
            <Input
              id="title"
              placeholder="Enter presentation title..."
              value={presentationTitle}
              onChange={(e) => setPresentationTitle(e.target.value)}
              disabled={isProcessing}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recording Section */}
            <div className="space-y-3">
              <Label>Record Audio</Label>
              <div className="flex flex-col space-y-2">
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                  variant={isRecording ? "destructive" : "default"}
                  className="w-full"
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-4 h-4 mr-2" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 mr-2" />
                      Start Recording
                    </>
                  )}
                </Button>
                
                {isRecording && (
                  <div className="text-center">
                    <div className="text-red-500 font-mono text-lg">
                      {formatDuration(recordingDuration)}
                    </div>
                    <div className="text-sm text-muted-foreground">Recording...</div>
                  </div>
                )}
              </div>
            </div>

            {/* Upload Section */}
            <div className="space-y-3">
              <Label>Upload File</Label>
              <div className="flex flex-col space-y-2">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  variant="outline"
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choose File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp3,.wav,.m4a,.webm"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {hasAudio && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={isPlaying ? pauseAudio : playAudio}
                      disabled={isProcessing}
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                    <div className="text-sm">
                      {uploadedFile ? uploadedFile.name : 'Recorded Audio'}
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearAudio}
                    disabled={isProcessing}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!hasAudio || !presentationTitle.trim() || isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full w-4 h-4 border-b-2 border-white mr-2" />
                Processing...
              </>
            ) : (
              'Generate Presentation'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}