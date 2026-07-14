// Core TypeScript types for BibiTool

export enum Platform {
  Bilibili = "bilibili",
  YouTube = "youtube",
  Podcast = "podcast",
  LocalFile = "local",
}

export interface SubtitleItem {
  start: number; // seconds
  end: number;
  text: string;
}

export interface VideoInfo {
  platform: Platform;
  videoId: string;
  title: string;
  coverUrl?: string;
  duration: number;
  subtitles?: SubtitleItem[];
  /** How subtitles were obtained: platform CC, danmaku fallback, Whisper, or none */
  subtitleSource?: "platform_cc" | "platform_danmaku" | "whisper_transcription" | "none";
}

export type SummaryMode = "brief" | "detailed";

export type SummaryStatus = "pending" | "processing" | "done" | "error";

export interface SummarizeOptions {
  subtitles: SubtitleItem[];
  mode: SummaryMode;
  model?: string;
  customPrompt?: string;
}

export interface Chapter {
  title: string;
  startTime: number;
  endTime: number;
  summary: string;
}

export interface SummaryResult {
  id: string;
  videoInfo: VideoInfo;
  summary: string;
  mode: SummaryMode;
  model: string;
  chapters?: Chapter[];
  createdAt: Date;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
