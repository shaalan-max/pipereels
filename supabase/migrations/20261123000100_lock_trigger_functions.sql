-- Trigger-only helpers must not be callable through the API.
revoke execute on function public._grant_assignee_access(), public._notify_comment(), public._prepare_file(),
  public._guard_video(), public._touch_updated_at() from public, anon, authenticated;
