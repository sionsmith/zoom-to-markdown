/**
 * Type definitions for Zoom Meeting Notes Archiver
 */

export interface ZoomConfig {
  accountId: string;
  clientId: string;
  clientSecret: string;
  userId?: string; // Optional: defaults to 'me'
}

export interface ZoomRecording {
  uuid: string;
  id: number;
  account_id: string;
  host_id: string;
  host_email: string;
  topic: string;
  start_time: string;
  duration: number;
  total_size: number;
  recording_count: number;
  share_url: string;
  recording_files: RecordingFile[];
  password?: string;
  recording_play_passcode?: string;
}

export interface RecordingFile {
  id: string;
  meeting_id: string;
  recording_start: string;
  recording_end: string;
  file_type: 'MP4' | 'M4A' | 'TIMELINE' | 'TRANSCRIPT' | 'CHAT' | 'CC' | 'CSV';
  file_extension: string;
  file_size: number;
  download_url: string;
  status: string;
  recording_type: string;
}

export interface ZoomRecordingsResponse {
  from: string;
  to: string;
  page_count: number;
  page_size: number;
  total_records: number;
  next_page_token?: string;
  meetings: ZoomRecording[];
}

export interface TranscriptSegment {
  speaker: string;
  timestamp: string;
  text: string;
}

export interface ParsedTranscript {
  segments: TranscriptSegment[];
  rawText: string;
}

export interface ActionItem {
  text: string;
  assignee?: string;
  dueDate?: string;
  confidence: number; // 0-1 score
}

export interface MeetingMetadata {
  title: string;
  meetingId: string;
  uuid: string;
  startTime: string;
  duration: number;
  host: string;
  participants: string[];
  recordingCount: number;
  transcriptAvailable: boolean;
}

export interface MeetingNote {
  metadata: MeetingMetadata;
  transcript: ParsedTranscript;
  actionItems: ActionItem[];
  keyPoints?: string[];
}

export interface ProcessedRecording {
  uuid: string;
  meetingId: string;
  processedAt: string;
  filePath: string;
  hash: string;
}

export interface State {
  lastFetchTimestamp: string;
  processedRecordings: Record<string, ProcessedRecording>;
  statistics: {
    totalMeetings: number;
    lastRunStatus: 'success' | 'failure' | 'partial';
    lastRunAt: string;
    consecutiveFailures: number;
  };
}

export interface Config {
  zoom: ZoomConfig;
  outputDir: string;
  pollIntervalMinutes?: number;
  enableActionItemExtraction?: boolean;
  enableLLMProcessing?: boolean;
  maxRecordingsPerRun?: number;
}
