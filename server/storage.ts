import { 
  type User, 
  type InsertUser, 
  type Presentation, 
  type InsertPresentation,
  type AudioFile,
  type InsertAudioFile
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Presentation methods
  getPresentation(id: string): Promise<Presentation | undefined>;
  getPresentationsByUser(userId: string): Promise<Presentation[]>;
  createPresentation(presentation: InsertPresentation & { userId: string }): Promise<Presentation>;
  updatePresentation(id: string, updates: Partial<Presentation>): Promise<Presentation | undefined>;
  
  // Audio file methods
  getAudioFile(id: string): Promise<AudioFile | undefined>;
  getAudioFilesByPresentation(presentationId: string): Promise<AudioFile[]>;
  createAudioFile(audioFile: InsertAudioFile): Promise<AudioFile>;
  updateAudioFile(id: string, updates: Partial<AudioFile>): Promise<AudioFile | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private presentations: Map<string, Presentation>;
  private audioFiles: Map<string, AudioFile>;

  constructor() {
    this.users = new Map();
    this.presentations = new Map();
    this.audioFiles = new Map();
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Presentation methods
  async getPresentation(id: string): Promise<Presentation | undefined> {
    return this.presentations.get(id);
  }

  async getPresentationsByUser(userId: string): Promise<Presentation[]> {
    return Array.from(this.presentations.values()).filter(
      (presentation) => presentation.userId === userId,
    );
  }

  async createPresentation(presentation: InsertPresentation & { userId: string }): Promise<Presentation> {
    const id = randomUUID();
    const newPresentation: Presentation = {
      ...presentation,
      id,
      userId: presentation.userId,
      transcript: null,
      slides: null,
      audioFileName: null,
      audioFileSize: null,
      processingStatus: 'pending' as const,
      htmlBundle: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      theme: presentation.theme || 'corporate',
    };
    this.presentations.set(id, newPresentation);
    return newPresentation;
  }

  async updatePresentation(id: string, updates: Partial<Presentation>): Promise<Presentation | undefined> {
    const presentation = this.presentations.get(id);
    if (!presentation) return undefined;
    
    const updatedPresentation = {
      ...presentation,
      ...updates,
      updatedAt: new Date(),
    };
    this.presentations.set(id, updatedPresentation);
    return updatedPresentation;
  }

  // Audio file methods
  async getAudioFile(id: string): Promise<AudioFile | undefined> {
    return this.audioFiles.get(id);
  }

  async getAudioFilesByPresentation(presentationId: string): Promise<AudioFile[]> {
    return Array.from(this.audioFiles.values()).filter(
      (audioFile) => audioFile.presentationId === presentationId,
    );
  }

  async createAudioFile(audioFile: InsertAudioFile): Promise<AudioFile> {
    const id = randomUUID();
    const newAudioFile: AudioFile = {
      ...audioFile,
      id,
      presentationId: audioFile.presentationId || null,
      duration: null,
      isProcessed: false,
      transcriptStatus: 'pending' as const,
      createdAt: new Date(),
    };
    this.audioFiles.set(id, newAudioFile);
    return newAudioFile;
  }

  async updateAudioFile(id: string, updates: Partial<AudioFile>): Promise<AudioFile | undefined> {
    const audioFile = this.audioFiles.get(id);
    if (!audioFile) return undefined;
    
    const updatedAudioFile = {
      ...audioFile,
      ...updates,
    };
    this.audioFiles.set(id, updatedAudioFile);
    return updatedAudioFile;
  }
}

export const storage = new MemStorage();
