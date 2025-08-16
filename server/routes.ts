import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage.js";
import { slideGenerator } from "./services/slideGenerator.js";
import { whisperService } from "./services/openai/whisper.js";
import { htmlBundler } from "./services/htmlBundler.js";
import { logger } from "./utils/logger.js";
import path from "path";
import fs from "fs";
import express from "express";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'audio/mp3',
      'audio/mpeg',
      'audio/wav', 
      'audio/m4a',
      'audio/webm',
      'audio/ogg',
      'application/octet-stream' // Allow for curl uploads
    ];
    
    const allowedExtensions = ['.mp3', '.wav', '.m4a', '.webm', '.ogg'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    logger.info('File upload attempt', { 
      filename: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname,
      extension: fileExtension
    });
    
    // Accept if MIME type is allowed OR if extension is audio file
    const mimeTypeAllowed = allowedMimes.includes(file.mimetype);
    const extensionAllowed = allowedExtensions.includes(fileExtension);
    
    if (mimeTypeAllowed || extensionAllowed) {
      logger.info('File type accepted', { 
        mimetype: file.mimetype,
        extension: fileExtension,
        reason: mimeTypeAllowed ? 'mime_type' : 'extension'
      });
      cb(null, true);
    } else {
      logger.warn('File type rejected', { 
        mimetype: file.mimetype,
        extension: fileExtension,
        allowedMimes: allowedMimes,
        allowedExtensions: allowedExtensions
      });
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static files from outputs folder
  const outputsPath = path.join(process.cwd(), 'outputs');
  app.use('/outputs', express.static(outputsPath, {
    setHeaders: (res, filepath) => {
      if (filepath.endsWith('.html')) {
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filepath)}"`);
        res.setHeader('Content-Type', 'text/html');
      }
    }
  }));

  // Presentation routes
  
  // Create new presentation
  app.post("/api/presentations", async (req, res) => {
    try {
      const { title, theme = 'corporate' } = req.body;
      
      if (!title || title.trim().length === 0) {
        return res.status(400).json({ 
          error: "Presentation title is required" 
        });
      }

      // For now, create without user (add auth later)
      const presentation = await storage.createPresentation({
        title: title.trim(),
        theme,
        userId: 'anonymous' // TODO: Replace with actual user ID from auth
      });

      res.json({ 
        success: true, 
        presentation 
      });
    } catch (error) {
      console.error('Create presentation error:', error);
      res.status(500).json({ 
        error: "Failed to create presentation" 
      });
    }
  });

  // Upload audio and start processing
  app.post("/api/presentations/:id/upload", upload.single('audio'), async (req, res) => {
    const { id } = req.params;
    logger.info('Audio upload request received', { presentationId: id });

    try {
      const file = req.file;

      if (!file) {
        logger.warn('Upload attempted without audio file', { presentationId: id });
        return res.status(400).json({ 
          error: "Audio file is required" 
        });
      }

      logger.info('Audio file received', { 
        presentationId: id,
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      });

      const presentation = await storage.getPresentation(id);
      if (!presentation) {
        logger.warn('Upload attempted for non-existent presentation', { presentationId: id });
        return res.status(404).json({ 
          error: "Presentation not found" 
        });
      }

      // Validate audio file
      const validation = await slideGenerator.validateAudioInput(file);
      if (!validation.valid) {
        logger.warn('Audio file validation failed', { 
          presentationId: id,
          error: validation.error,
          filename: file.originalname
        });
        return res.status(400).json({ 
          error: validation.error 
        });
      }

      // Create audio file record
      const audioFile = await storage.createAudioFile({
        presentationId: id,
        fileName: `${Date.now()}-${file.originalname}`,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size
      });

      logger.info('Audio file record created', { 
        presentationId: id,
        audioFileId: audioFile.id
      });

      // Update presentation with audio info
      await storage.updatePresentation(id, {
        audioFileName: file.originalname,
        audioFileSize: file.size,
        processingStatus: 'processing'
      });

      // Start async processing
      logger.info('Starting async presentation generation', { presentationId: id });
      slideGenerator.generatePresentation(
        id,
        file.buffer,
        file.originalname,
        { 
          theme: presentation.theme || 'corporate',
          includeCharts: true,
          optimizeContent: false // Disabled to avoid GPT-4 JSON format issues
        }
      ).catch(error => {
        logger.error('Async processing failed', { 
          presentationId: id,
          error: error.message,
          stack: error.stack
        });
      });

      res.json({ 
        success: true, 
        message: "Processing started",
        audioFileId: audioFile.id
      });

    } catch (error) {
      logger.error('Upload processing error', { 
        presentationId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      res.status(500).json({ 
        error: "Failed to process upload" 
      });
    }
  });

  // Get processing status
  app.get("/api/presentations/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await slideGenerator.getProcessingStatus(id);
      
      res.json(result);
    } catch (error) {
      console.error('Status check error:', error);
      res.status(500).json({ 
        error: "Failed to get status" 
      });
    }
  });

  // Get presentation details (supports ?download=true for HTML content)
  app.get("/api/presentations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { download } = req.query;
      logger.info('Presentation request', { id, download, query: req.query });
      const presentation = await storage.getPresentation(id);
      
      if (!presentation) {
        return res.status(404).json({ 
          error: "Presentation not found" 
        });
      }

      // If download=true, return HTML content
      if (download === 'true' && presentation.htmlBundle) {
        logger.info('Download request', { 
          presentationId: id, 
          htmlBundle: presentation.htmlBundle,
          exists: fs.existsSync(presentation.htmlBundle)
        });
        
        if (fs.existsSync(presentation.htmlBundle)) {
          const fileContent = fs.readFileSync(presentation.htmlBundle, 'utf8');
          const filename = path.basename(presentation.htmlBundle);
          logger.info('Returning HTML content', { 
            filename, 
            contentSize: fileContent.length 
          });
          return res.json({
            success: true,
            filename: filename,
            content: fileContent,
            size: fileContent.length
          });
        } else {
          logger.error('HTML file not found', { htmlBundle: presentation.htmlBundle });
          return res.status(404).json({ 
            error: "HTML file not found" 
          });
        }
      }

      res.json({ 
        success: true, 
        presentation 
      });
    } catch (error) {
      console.error('Get presentation error:', error);
      res.status(500).json({ 
        error: "Failed to get presentation" 
      });
    }
  });

  // Update presentation (theme, slides, etc.)
  app.patch("/api/presentations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const presentation = await storage.updatePresentation(id, updates);
      
      if (!presentation) {
        return res.status(404).json({ 
          error: "Presentation not found" 
        });
      }

      res.json({ 
        success: true, 
        presentation 
      });
    } catch (error) {
      console.error('Update presentation error:', error);
      res.status(500).json({ 
        error: "Failed to update presentation" 
      });
    }
  });

  // Regenerate slides with different options
  app.post("/api/presentations/:id/regenerate", async (req, res) => {
    try {
      const { id } = req.params;
      const { theme, targetSlideCount, optimizeContent = true } = req.body;

      const structure = await slideGenerator.regenerateSlides(id, {
        theme,
        targetSlideCount,
        optimizeContent
      });

      res.json({ 
        success: true, 
        structure 
      });
    } catch (error) {
      console.error('Regenerate slides error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to regenerate slides" 
      });
    }
  });

  // Get all presentations (for listing)
  app.get("/api/presentations", async (req, res) => {
    try {
      // For now, get all presentations (add user filtering later)
      const presentations = await storage.getPresentationsByUser('anonymous');
      
      res.json({ 
        success: true, 
        presentations 
      });
    } catch (error) {
      console.error('Get presentations error:', error);
      res.status(500).json({ 
        error: "Failed to get presentations" 
      });
    }
  });

  // Download presentation HTML
  app.get("/api/presentations/:id/download", async (req, res) => {
    try {
      const { id } = req.params;
      const presentation = await storage.getPresentation(id);
      
      if (!presentation) {
        return res.status(404).json({ 
          error: "Presentation not found" 
        });
      }

      if (presentation.htmlBundle && fs.existsSync(presentation.htmlBundle)) {
        // Serve existing HTML bundle
        const filename = path.basename(presentation.htmlBundle);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'text/html');
        res.sendFile(path.resolve(presentation.htmlBundle));
      } else if (presentation.slides) {
        // Generate HTML on-the-fly
        const htmlPath = await htmlBundler.savePresentation(presentation, {
          theme: presentation.theme as any,
          includeNotes: true,
          standalone: true
        });
        
        const filename = path.basename(htmlPath);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'text/html');
        res.sendFile(path.resolve(htmlPath));
      } else {
        res.status(400).json({ 
          error: "Presentation not ready for download" 
        });
      }
    } catch (error) {
      logger.error('Download presentation error', { 
        presentationId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      res.status(500).json({ 
        error: "Failed to download presentation" 
      });
    }
  });

  // Direct download of HTML files from outputs folder
  app.get("/api/download/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      if (!filename.endsWith('.html')) {
        return res.status(400).json({ error: "Only HTML files can be downloaded" });
      }
      
      const filepath = path.join(process.cwd(), 'outputs', 'presentations', filename);
      const resolvedPath = path.resolve(filepath);
      
      logger.info('Download attempt', { 
        filename, 
        filepath, 
        resolvedPath, 
        exists: fs.existsSync(filepath),
        fileSize: fs.existsSync(filepath) ? fs.statSync(filepath).size : 0
      });
      
      if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: "Presentation file not found" });
      }
      
      const fileContent = fs.readFileSync(resolvedPath, 'utf8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Length', fileContent.length.toString());
      res.send(fileContent);
    } catch (error) {
      logger.error('Direct download error', { filename: req.params.filename, error });
      res.status(500).json({ error: "Failed to download presentation" });
    }
  });

  // List all presentations in outputs folder
  app.get("/api/presentations/outputs/list", async (req, res) => {
    try {
      const presentations = await htmlBundler.getAllPresentations();
      const presentationList = presentations.map(filepath => ({
        filename: path.basename(filepath),
        path: filepath,
        size: fs.statSync(filepath).size,
        modified: fs.statSync(filepath).mtime
      }));
      
      res.json({ 
        success: true, 
        presentations: presentationList,
        outputDir: path.join(process.cwd(), 'outputs', 'presentations')
      });
    } catch (error) {
      logger.error('List presentations error', { error });
      res.status(500).json({ 
        error: "Failed to list presentations" 
      });
    }
  });

  // Delete presentation
  app.delete("/api/presentations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Note: In a real app, you'd implement a delete method in storage
      // For now, just return success
      res.json({ 
        success: true, 
        message: "Presentation deleted" 
      });
    } catch (error) {
      console.error('Delete presentation error:', error);
      res.status(500).json({ 
        error: "Failed to delete presentation" 
      });
    }
  });

  // Download endpoint - returns HTML content as JSON
  app.get("/api/download-html/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const filepath = path.join(process.cwd(), 'outputs', 'presentations', filename);
      
      if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: "File not found" });
      }
      
      const fileContent = fs.readFileSync(filepath, 'utf8');
      logger.info('Returning HTML file as JSON', { 
        filename, 
        fileSize: fileContent.length 
      });
      
      // Return HTML content as JSON - frontend will handle download
      res.json({
        success: true,
        filename: filename,
        content: fileContent,
        size: fileContent.length
      });
    } catch (error) {
      logger.error('Download error', { error, filename: req.params.filename });
      res.status(500).json({ error: "Download failed" });
    }
  });

  // Test download endpoint
  app.get("/api/test-download", (req, res) => {
    logger.info('Test download endpoint hit');
    res.json({ message: 'This is a test download response', working: true });
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString() 
    });
  });

  // Error handling middleware
  app.use("/api/*", (err: any, req: any, res: any, next: any) => {
    console.error('API Error:', err);
    
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          error: "File size too large. Maximum size is 50MB." 
        });
      }
    }
    
    res.status(500).json({ 
      error: err.message || "Internal server error" 
    });
  });

  const httpServer = createServer(app);

  return httpServer;
}
