import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  EyeOff, 
  BarChart3,
  FileText,
  Crown,
  MessageSquare,
  Edit3,
  Save,
  X
} from 'lucide-react';

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

interface SlidePreviewProps {
  slides: SlideContent[];
  theme?: string;
  onSlidesUpdate?: (slides: SlideContent[]) => void;
  onThemeChange?: (theme: string) => void;
  isEditable?: boolean;
}

const SLIDE_TYPE_CONFIG = {
  title: { icon: Crown, label: 'Title', color: 'bg-purple-100 text-purple-700' },
  content: { icon: FileText, label: 'Content', color: 'bg-blue-100 text-blue-700' },
  chart: { icon: BarChart3, label: 'Chart', color: 'bg-green-100 text-green-700' },
  conclusion: { icon: MessageSquare, label: 'Conclusion', color: 'bg-orange-100 text-orange-700' },
};

const THEMES = [
  { id: 'corporate', name: 'Corporate', colors: 'bg-slate-900 text-white' },
  { id: 'light', name: 'Light', colors: 'bg-white text-slate-900 border' },
  { id: 'dark', name: 'Dark', colors: 'bg-gray-900 text-white' },
];

export function SlidePreview({ 
  slides, 
  theme = 'corporate', 
  onSlidesUpdate,
  onThemeChange,
  isEditable = false 
}: SlidePreviewProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showSpeakerNotes, setShowSpeakerNotes] = useState(false);
  const [editingSlide, setEditingSlide] = useState<string | null>(null);
  const [editedSlides, setEditedSlides] = useState<SlideContent[]>(slides);

  useEffect(() => {
    setEditedSlides(slides);
  }, [slides]);

  const currentSlide = editedSlides[currentSlideIndex];

  const nextSlide = () => {
    if (currentSlideIndex < editedSlides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const startEditing = (slideId: string) => {
    if (isEditable) {
      setEditingSlide(slideId);
    }
  };

  const saveEdit = () => {
    setEditingSlide(null);
    onSlidesUpdate?.(editedSlides);
  };

  const cancelEdit = () => {
    setEditedSlides(slides);
    setEditingSlide(null);
  };

  const updateSlide = (slideId: string, updates: Partial<SlideContent>) => {
    setEditedSlides(prev => 
      prev.map(slide => 
        slide.id === slideId 
          ? { ...slide, ...updates }
          : slide
      )
    );
  };

  const renderSlideContent = (slide: SlideContent) => {
    const themeConfig = THEMES.find(t => t.id === theme) || THEMES[0];
    const isEditing = editingSlide === slide.id;

    return (
      <div className={`w-full h-96 rounded-lg p-8 flex flex-col justify-center ${themeConfig.colors}`}>
        {isEditing ? (
          <div className="space-y-4">
            <input
              type="text"
              value={slide.title}
              onChange={(e) => updateSlide(slide.id, { title: e.target.value })}
              className="w-full text-2xl font-bold bg-transparent border-b border-current pb-2"
              placeholder="Slide title..."
            />
            <Textarea
              value={slide.content}
              onChange={(e) => updateSlide(slide.id, { content: e.target.value })}
              className="w-full min-h-32 bg-transparent border border-current resize-none"
              placeholder="Slide content..."
            />
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold mb-6 text-center">
              {slide.title}
            </h1>
            
            {slide.type === 'chart' && slide.chartData ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-24 h-24 mx-auto mb-4 opacity-60" />
                  <p className="text-lg">{slide.chartData.title}</p>
                  <p className="text-sm opacity-80 mt-2">
                    Chart: {slide.chartData.type} with {slide.chartData.data.length} data points
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center">
                <div className="w-full">
                  {slide.content.split('\n').map((line, index) => (
                    <p key={index} className="text-lg mb-4 leading-relaxed">
                      {line.trim().startsWith('•') || line.trim().startsWith('-') ? (
                        <span className="flex items-start">
                          <span className="mr-3">•</span>
                          <span>{line.replace(/^[•-]\s*/, '')}</span>
                        </span>
                      ) : (
                        line
                      )}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        
        {isEditable && !isEditing && (
          <button
            onClick={() => startEditing(slide.id)}
            className="absolute top-4 right-4 p-2 bg-black bg-opacity-20 rounded-lg hover:bg-opacity-40 transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  };

  if (!slides.length) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 text-center text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No slides generated yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Slide Preview
            </CardTitle>
            <CardDescription>
              Slide {currentSlideIndex + 1} of {editedSlides.length}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            {editingSlide && (
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEdit}>
                  <Save className="w-3 h-3 mr-1" />
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={cancelEdit}>
                  <X className="w-3 h-3 mr-1" />
                  Cancel
                </Button>
              </div>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSpeakerNotes(!showSpeakerNotes)}
            >
              {showSpeakerNotes ? (
                <EyeOff className="w-4 h-4 mr-1" />
              ) : (
                <MessageSquare className="w-4 h-4 mr-1" />
              )}
              Notes
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Theme Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Theme:</span>
          {THEMES.map((themeOption) => (
            <button
              key={themeOption.id}
              onClick={() => onThemeChange?.(themeOption.id)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                theme === themeOption.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {themeOption.name}
            </button>
          ))}
        </div>

        <Tabs defaultValue="preview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="space-y-4">
            {/* Slide Navigation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevSlide}
                  disabled={currentSlideIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <div className="flex items-center gap-2">
                  {currentSlide && (
                    <>
                      <Badge className={SLIDE_TYPE_CONFIG[currentSlide.type].color}>
                        {SLIDE_TYPE_CONFIG[currentSlide.type].label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {currentSlide.title}
                      </span>
                    </>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextSlide}
                  disabled={currentSlideIndex === editedSlides.length - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Main Slide Display */}
            <div className="relative">
              {currentSlide && renderSlideContent(currentSlide)}
            </div>

            {/* Speaker Notes */}
            {showSpeakerNotes && currentSlide && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageSquare className="w-4 h-4" />
                    Speaker Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {editingSlide === currentSlide.id ? (
                    <Textarea
                      value={currentSlide.speakerNotes}
                      onChange={(e) => updateSlide(currentSlide.id, { speakerNotes: e.target.value })}
                      className="min-h-24"
                      placeholder="Speaker notes..."
                    />
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {currentSlide.speakerNotes || 'No speaker notes available for this slide.'}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="overview">
            <ScrollArea className="h-96">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {editedSlides.map((slide, index) => {
                  const typeConfig = SLIDE_TYPE_CONFIG[slide.type];
                  const Icon = typeConfig.icon;
                  
                  return (
                    <Card
                      key={slide.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        index === currentSlideIndex ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setCurrentSlideIndex(index)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <Badge className={typeConfig.color} variant="secondary">
                            <Icon className="w-3 h-3 mr-1" />
                            {typeConfig.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {index + 1}
                          </span>
                        </div>
                        
                        <h4 className="font-medium text-sm mb-2 line-clamp-2">
                          {slide.title}
                        </h4>
                        
                        <p className="text-xs text-muted-foreground line-clamp-3">
                          {slide.content}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}