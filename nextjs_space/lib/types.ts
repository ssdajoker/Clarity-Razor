export interface ClarityTile {
  objective: string;
  constraints: string[];
  deletion_pass: string[];
  five_step_flow: string[];
  single_next_action: string;
  metrics: string[];
  feedback_loop: string;
  assumptions: string[];
  followup_questions?: string[];
}

export interface UploadedFile {
  id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  cloud_storage_path: string;
  isPublic: boolean;
  createdAt: string;
}

export interface TileWithFiles {
  id: string;
  mode: string;
  rawInput: any;
  tileJson: any;
  tags: string[];
  createdAt: string;
  files: UploadedFile[];
}