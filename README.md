# 🎙️ Voice to Slides - AI-Powered Presentation Generator

Transform your speech into professional presentations with AI. Upload audio files or record directly to generate structured, engaging slide decks powered by OpenAI Whisper and GPT-4.

![Voice to Slides Demo](https://img.shields.io/badge/Demo-Live-brightgreen) ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white) ![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB) ![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)

## ✨ Features

### 🎯 Core Functionality
- **Smart Audio Transcription** - Advanced speech recognition with OpenAI Whisper
- **AI-Powered Content Analysis** - Intelligent slide generation with GPT-4
- **Professional Slide Creation** - Structured presentations with speaker notes
- **Multiple Export Formats** - Self-contained HTML presentations
- **Real-time Processing** - Live status updates during generation

### 🎨 Enhanced Presentation Styling
- **Modern Typography** - Professional Inter font with optimized weights
- **Gradient Backgrounds** - Beautiful theme-based gradient designs
- **Glassmorphism Effects** - Translucent slides with backdrop blur
- **Interactive Animations** - Smooth hover effects and transitions
- **Multiple Themes** - Corporate, Dark, and Light theme options

### 🎮 Navigation Features
- **Keyboard Navigation** - Arrow keys for slide navigation (like PowerPoint)
- **Mouse Wheel Support** - Scroll through slides naturally
- **Smooth Transitions** - Fluid animations between slides
- **Responsive Design** - Works perfectly on desktop and mobile

### 🔧 Technical Features
- **File Upload Support** - Multiple audio formats (MP3, WAV, M4A, WebM, OGG)
- **Processing Status** - Real-time updates with timeout protection
- **Error Handling** - Comprehensive error recovery and user feedback
- **Self-contained Output** - HTML files work offline anywhere

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd buildathon-project2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Add your OpenAI API key to .env
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5000`

## 🎯 How to Use

1. **Upload Audio** - Select an audio file or record directly in the browser
2. **Enter Title** - Provide a title for your presentation
3. **Wait for Processing** - AI analyzes your speech and generates slides
4. **Review & Edit** - Customize slides, themes, and content as needed
5. **Download** - Export as a professional HTML presentation

### Supported Audio Formats
- MP3 (.mp3)
- WAV (.wav)
- M4A (.m4a)
- WebM (.webm)
- OGG (.ogg)

## 🎨 Presentation Themes

### Corporate Theme
- Professional purple-to-blue gradients
- Clean typography and spacing
- Perfect for business presentations

### Dark Theme
- Elegant slate backgrounds
- Light text for better contrast
- Ideal for tech presentations

### Light Theme
- Warm, inviting color palette
- High readability design
- Great for educational content

## ⌨️ Keyboard Shortcuts

Once your presentation is generated, use these shortcuts:

- `→` Right Arrow - Next slide
- `←` Left Arrow - Previous slide
- Mouse wheel - Navigate slides naturally

## 🏗️ Architecture

```
├── client/          # React frontend with TypeScript
├── server/          # Express.js backend
├── shared/          # Shared types and schemas
├── outputs/         # Generated presentations
└── tests/          # Playwright test suites
```

### Key Technologies
- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express, TypeScript
- **AI Services**: OpenAI Whisper (transcription), GPT-4 (content generation)
- **Storage**: File-based with JSON data persistence
- **Testing**: Playwright for E2E testing

## 🔧 Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run Playwright tests
npm run test:ui      # Run tests with UI
```

### Project Structure
```
server/
├── services/
│   ├── htmlBundler.ts     # Enhanced presentation styling
│   ├── slideGenerator.ts  # AI-powered slide generation
│   └── openai/           # OpenAI service integrations
├── routes.ts             # API endpoints
└── storage.ts           # Data persistence

client/
├── components/
│   ├── AudioInput.tsx        # File upload interface
│   ├── ProcessingStatus.tsx  # Real-time status updates
│   └── SlidePreview.tsx     # Presentation preview
└── pages/
    └── home.tsx             # Main application interface
```

## 🎯 Key Features in Detail

### Enhanced HTML Output
Generated presentations include:
- **Modern CSS** with flexbox layouts and animations
- **Keyboard navigation** with arrow key support
- **Print-friendly** styles for document printing
- **Interactive elements** with hover effects
- **Responsive design** for all screen sizes

### AI-Powered Processing
- **Speech-to-Text**: OpenAI Whisper for accurate transcription
- **Content Analysis**: GPT-4 analyzes speech patterns and topics
- **Slide Generation**: Automatic slide structuring with speaker notes
- **Theme Application**: Professional styling with multiple theme options

### Robust Error Handling
- **Timeout Protection**: 2-minute processing timeouts
- **File Validation**: Audio format and size validation
- **Network Resilience**: 10-second request timeouts
- **User Feedback**: Clear error messages and recovery options

## 📊 Performance

- **File Size Limit**: 50MB maximum audio files
- **Processing Time**: Typically 1-3 minutes depending on audio length
- **Output Size**: ~15-20KB per generated HTML presentation
- **Browser Support**: Modern browsers with ES6+ support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **OpenAI** for providing Whisper and GPT-4 APIs
- **React Team** for the excellent frontend framework
- **Tailwind CSS** for the utility-first CSS framework
- **Vite** for the fast build tool

## 🔗 Links

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [React Documentation](https://reactjs.org/)
- [TypeScript Documentation](https://www.typescriptlang.org/)

---

**Built with ❤️ using OpenAI GPT-4, Whisper, React, and TypeScript**