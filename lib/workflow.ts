import type { Client, Profile, Role, Stage, Video } from "@/lib/types";

type Waiting = "manager" | "scriptwriter" | "client" | "editor" | "none";

export interface StageMeta {
  key: Stage;
  label: string; // team wording
  clientLabel: string; // client-facing wording
  waitingOn: Waiting;
  dot: string; // tailwind bg class
  pill: string; // tailwind classes for badge
  step: number; // 1..8 for the client progress bar
}

export const STAGES: StageMeta[] = [
  { key: "planned", label: "Planned", clientLabel: "Planned", waitingOn: "manager", dot: "bg-zinc-400", pill: "bg-zinc-100 text-zinc-700 ring-zinc-200", step: 1 },
  { key: "scripting", label: "Scripting", clientLabel: "Writing script", waitingOn: "scriptwriter", dot: "bg-violet-500", pill: "bg-violet-50 text-violet-700 ring-violet-200", step: 2 },
  { key: "script_review", label: "Script review", clientLabel: "Review script", waitingOn: "client", dot: "bg-amber-500", pill: "bg-amber-50 text-amber-800 ring-amber-200", step: 2 },
  { key: "shooting", label: "Client shooting", clientLabel: "Ready to shoot", waitingOn: "client", dot: "bg-orange-500", pill: "bg-orange-50 text-orange-800 ring-orange-200", step: 3 },
  { key: "footage_check", label: "Footage check", clientLabel: "Checking footage", waitingOn: "manager", dot: "bg-sky-500", pill: "bg-sky-50 text-sky-700 ring-sky-200", step: 4 },
  { key: "editing", label: "Editing", clientLabel: "Editing", waitingOn: "editor", dot: "bg-indigo-500", pill: "bg-indigo-50 text-indigo-700 ring-indigo-200", step: 5 },
  { key: "internal_review", label: "Internal review", clientLabel: "Quality check", waitingOn: "manager", dot: "bg-cyan-600", pill: "bg-cyan-50 text-cyan-800 ring-cyan-200", step: 6 },
  { key: "client_review", label: "Client review", clientLabel: "Review video", waitingOn: "client", dot: "bg-amber-500", pill: "bg-amber-50 text-amber-800 ring-amber-200", step: 7 },
  { key: "scheduled", label: "Scheduled", clientLabel: "Scheduled", waitingOn: "manager", dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 ring-emerald-200", step: 8 },
  { key: "posted", label: "Posted", clientLabel: "Live", waitingOn: "none", dot: "bg-emerald-600", pill: "bg-emerald-100 text-emerald-800 ring-emerald-300", step: 8 },
];

export const STAGE: Record<Stage, StageMeta> = Object.fromEntries(STAGES.map((s) => [s.key, s])) as Record<Stage, StageMeta>;

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  account_manager: "Account manager",
  scriptwriter: "Scriptwriter",
  editor: "Video editor",
  client: "Client",
};

export const WAITING_LABEL: Record<Waiting, string> = {
  manager: "Account manager",
  scriptwriter: "Scriptwriter",
  client: "Client",
  editor: "Editor",
  none: "Done",
};

export const PLATFORMS = ["instagram", "tiktok", "youtube", "facebook", "linkedin", "x"] as const;
export const PLATFORM_LABEL: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube Shorts",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  x: "X",
};

export type ActionKey =
  | "start_script"
  | "send_script"
  | "approve_script"
  | "request_script_changes"
  | "submit_footage"
  | "approve_footage"
  | "request_reshoot"
  | "submit_edit"
  | "request_edit_changes"
  | "send_to_client"
  | "approve_video"
  | "request_video_changes"
  | "mark_posted";

export interface ActionMeta {
  key: ActionKey;
  stage: Stage;
  label: string;
  clientLabel?: string;
  roles: Role[]; // owner is always allowed
  primary?: boolean;
  needsNote?: boolean;
  notePrompt?: string;
  assign?: "scriptwriter" | "editor";
  needsUrl?: boolean;
  onBehalf?: boolean; // team doing a client step
}

export const ACTIONS: ActionMeta[] = [
  { key: "start_script", stage: "planned", label: "Start script", roles: ["account_manager"], primary: true, assign: "scriptwriter" },
  { key: "send_script", stage: "scripting", label: "Send script to client", roles: ["account_manager", "scriptwriter"], primary: true },
  { key: "approve_script", stage: "script_review", label: "Approve script", clientLabel: "Approve script", roles: ["client", "account_manager"], primary: true, onBehalf: true },
  { key: "request_script_changes", stage: "script_review", label: "Request script changes", clientLabel: "Ask for changes", roles: ["client", "account_manager"], needsNote: true, notePrompt: "What should change in the script?", onBehalf: true },
  { key: "submit_footage", stage: "shooting", label: "Footage received", clientLabel: "I'm done uploading", roles: ["client", "account_manager"], primary: true, onBehalf: true },
  { key: "approve_footage", stage: "footage_check", label: "Approve footage → editing", roles: ["account_manager"], primary: true, assign: "editor" },
  { key: "request_reshoot", stage: "footage_check", label: "Ask client to reshoot", roles: ["account_manager"], needsNote: true, notePrompt: "Tell the client what to reshoot and why (they will see this)." },
  { key: "submit_edit", stage: "editing", label: "Submit edit for review", roles: ["editor", "account_manager"], primary: true },
  { key: "request_edit_changes", stage: "internal_review", label: "Send back to editor", roles: ["account_manager"], needsNote: true, notePrompt: "What should the editor fix? (internal — the client won't see this)" },
  { key: "send_to_client", stage: "internal_review", label: "Send to client for review", roles: ["account_manager"], primary: true },
  { key: "approve_video", stage: "client_review", label: "Approve video", clientLabel: "Approve video", roles: ["client", "account_manager"], primary: true, onBehalf: true },
  { key: "request_video_changes", stage: "client_review", label: "Request video changes", clientLabel: "Ask for changes", roles: ["client", "account_manager"], needsNote: true, notePrompt: "What should change in the video?", onBehalf: true },
  { key: "mark_posted", stage: "scheduled", label: "Mark as posted", roles: ["account_manager"], primary: true, needsUrl: true },
];

export function actionsFor(stage: Stage, role: Role): ActionMeta[] {
  return ACTIONS.filter((a) => a.stage === stage && (role === "owner" || a.roles.includes(role)));
}

export function isTeam(role: Role) {
  return role !== "client";
}

export function isManager(role: Role) {
  return role === "owner" || role === "account_manager";
}

/** Is the next step of this video waiting on this team member? */
export function isOnMe(video: Video, me: Profile, client: Client | undefined): boolean {
  const w = STAGE[video.stage].waitingOn;
  const managesClient = me.role === "owner" || (me.role === "account_manager" && client?.account_manager_id === me.id);
  if (w === "manager") return managesClient;
  if (w === "scriptwriter") return video.scriptwriter_id ? video.scriptwriter_id === me.id : managesClient;
  if (w === "editor") return video.editor_id ? video.editor_id === me.id : managesClient;
  return false;
}

export function isWaitingOnClient(video: Video) {
  return STAGE[video.stage].waitingOn === "client";
}

export const CLIENT_ACTION_STAGES: Stage[] = ["script_review", "shooting", "client_review"];
