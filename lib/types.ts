export type Role = "owner" | "account_manager" | "scriptwriter" | "editor" | "client";
export type Stage =
  | "planned"
  | "scripting"
  | "script_review"
  | "shooting"
  | "footage_check"
  | "editing"
  | "internal_review"
  | "client_review"
  | "scheduled"
  | "posted";
export type PlanStatus = "draft" | "sent" | "changes_requested" | "approved";
export type FileKind = "raw" | "edit" | "other";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  client_id: string | null;
  active: boolean;
  created_at: string;
  onboarding_seen?: string[];
}

export interface AgencySettings {
  id: number;
  name: string;
  tagline: string;
  brand_color: string;
  logo_url: string | null;
}

export interface Client {
  id: string;
  name: string;
  industry: string;
  brand_color: string;
  platforms: string[];
  videos_per_month: number;
  account_manager_id: string | null;
  status: "active" | "paused" | "archived";
  notes: string;
  created_at: string;
}

export interface Plan {
  id: string;
  client_id: string;
  month: string;
  title: string;
  strategy: string;
  status: PlanStatus;
  client_feedback: string | null;
  sent_at: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface Video {
  id: string;
  client_id: string;
  plan_id: string | null;
  title: string;
  concept: string;
  hook: string;
  platforms: string[];
  stage: Stage;
  script: string;
  shoot_notes: string;
  caption: string;
  hashtags: string;
  post_date: string | null;
  posted_url: string | null;
  scriptwriter_id: string | null;
  editor_id: string | null;
  sort_order: number;
  stage_changed_at: string;
  created_at: string;
  updated_at: string;
}

export interface VideoFile {
  id: string;
  video_id: string;
  client_id: string;
  kind: FileKind;
  storage_path: string;
  file_name: string;
  size_bytes: number;
  mime_type: string;
  version: number;
  client_visible: boolean;
  uploaded_by: string | null;
  created_at: string;
}

export interface Comment {
  id: string;
  video_id: string;
  file_id: string | null;
  author_id: string | null;
  body: string;
  timecode: number | null;
  internal: boolean;
  resolved: boolean;
  created_at: string;
}

export interface Activity {
  id: number;
  client_id: string;
  video_id: string | null;
  plan_id: string | null;
  actor_id: string | null;
  action: string;
  from_stage: Stage | null;
  to_stage: Stage | null;
  note: string | null;
  internal: boolean;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}
