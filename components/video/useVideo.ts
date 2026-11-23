"use client";

import { must, useLoad, useSupabase } from "@/components/Me";
import type { Activity, Client, Comment, Plan, Profile, Video, VideoFile } from "@/lib/types";
import { signedUrls } from "@/lib/upload";

export function useVideo(id: string) {
  const supabase = useSupabase();
  return useLoad(async () => {
    const video = must(await supabase.from("videos").select("*").eq("id", id).maybeSingle()) as Video | null;
    if (!video) throw new Error("This video doesn't exist or you don't have access to it.");
    const [client, files, comments, activity, people, plan] = await Promise.all([
      supabase.from("clients").select("*").eq("id", video.client_id).single(),
      supabase.from("video_files").select("*").eq("video_id", id).order("created_at"),
      supabase.from("comments").select("*").eq("video_id", id).order("created_at"),
      supabase.from("activity").select("*").eq("video_id", id).order("created_at"),
      supabase.from("profiles").select("*"),
      video.plan_id ? supabase.from("content_plans").select("*").eq("id", video.plan_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    ]);
    const f = must(files) as VideoFile[];
    const p = must(people) as Profile[];
    return {
      video,
      client: must(client) as Client,
      files: f,
      urls: await signedUrls(supabase, f),
      comments: must(comments) as Comment[],
      activity: must(activity) as Activity[],
      people: p,
      peopleMap: new Map(p.map((x) => [x.id, x])),
      plan: (plan.data as Plan | null) ?? null,
    };
  }, [id]);
}

export type VideoData = NonNullable<ReturnType<typeof useVideo>["data"]>;
