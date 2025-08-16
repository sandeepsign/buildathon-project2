import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, json, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const presentations = pgTable("presentations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  title: text("title").notNull(),
  transcript: text("transcript"),
  slides: json("slides").$type<Array<{
    id: string;
    title: string;
    content: string;
    speakerNotes: string;
    type: 'title' | 'content' | 'chart' | 'conclusion';
  }>>(),
  theme: varchar("theme").default('corporate'),
  audioFileName: text("audio_file_name"),
  audioFileSize: integer("audio_file_size"),
  processingStatus: varchar("processing_status").default('pending').$type<'pending' | 'processing' | 'completed' | 'failed'>(),
  htmlBundle: text("html_bundle"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const audioFiles = pgTable("audio_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  presentationId: varchar("presentation_id").references(() => presentations.id),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  duration: integer("duration"),
  isProcessed: boolean("is_processed").default(false),
  transcriptStatus: varchar("transcript_status").default('pending').$type<'pending' | 'processing' | 'completed' | 'failed'>(),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPresentationSchema = createInsertSchema(presentations).pick({
  title: true,
  theme: true,
});

export const insertAudioFileSchema = createInsertSchema(audioFiles).pick({
  presentationId: true,
  fileName: true,
  originalName: true,
  mimeType: true,
  fileSize: true,
  duration: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Presentation = typeof presentations.$inferSelect;
export type InsertPresentation = z.infer<typeof insertPresentationSchema>;
export type AudioFile = typeof audioFiles.$inferSelect;
export type InsertAudioFile = z.infer<typeof insertAudioFileSchema>;
