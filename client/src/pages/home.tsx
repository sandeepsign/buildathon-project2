import { BookOpen } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased">
      {/* Main Layout */}
      <main className="min-h-screen flex items-center justify-center p-4">
        {/* Hello World Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 sm:p-12 max-w-md w-full text-center transition-all duration-300 hover:shadow-xl hover:scale-105" data-testid="card-hello-world">
          {/* Welcome Message */}
          <div className="space-y-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto" data-testid="icon-container">
              <BookOpen className="w-8 h-8 text-blue-600" data-testid="icon-book" />
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-800 leading-tight" data-testid="text-heading">
              Hello World
            </h1>
            
            <p className="text-slate-600 text-lg leading-relaxed" data-testid="text-description">
              Welcome to your new web application. This is a clean, responsive starting point ready for development.
            </p>
            
            <div className="pt-4">
              <div className="inline-flex items-center space-x-2 text-sm text-slate-500" data-testid="status-indicator">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" data-testid="indicator-dot"></div>
                <span data-testid="text-status">Application loaded successfully</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-4 left-1/2 transform -translate-x-1/2">
        <div className="bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 text-xs text-slate-500 border border-slate-200" data-testid="footer-info">
          <span>Ready for development • {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
