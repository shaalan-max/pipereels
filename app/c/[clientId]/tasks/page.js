"use client";
import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search, Plus, MessageSquare, ChevronLeft, AlertTriangle, Check, Upload, FileText, Paperclip,
} from "lucide-react";
import { useWorkspace } from "@/lib/workspace-context";
import {
  C, FONT, Card, Button, Avatar, StatusPill, Modal, Field, Toast, inputStyle,
  STATUS_META, fmtDate, fmtDateFull,
} from "@/lib/ui";

export default function TasksPage() {
  return (
    <Suspense fallback={null}>
      <TasksPageInner />
    </Suspense>
  );
}

function TasksPageInner() {
  const { profile, client, clientId, supabase } = useWorkspace();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isAgency = profile.role !== "client";

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [openTaskId, setOpenTaskId] = useState(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [toast, setToast] = useState("");

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("tasks").select("*").eq("client_id", clientId).order("due_date");
    setTasks(data || []);
    setLoading(false);
  }, [clientId, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const openId = searchParams.get("open");
    if (openId) setOpenTaskId(openId);
  }, [searchParams]);

  let visible = tasks;
  if (search.trim()) visible = visible.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()));
  if (statusFilter !== "All Statuses") visible = visible.filter((t) => t.status === statusFilter);

  const openTask = tasks.find((t) => t.id === openTaskId);

  return (
    <div style={{ padding: "24px 20px 90px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.navy, margin: 0 }}>Task Pipeline</h1>
          <p style={{ color: C.textFaint, fontSize: 13, marginTop: 4 }}>Manage and track deliverables for {client.name}.</p>
        </div>
        {isAgency && <Button icon={Plus} onClick={() => setShowNewTask(true)}>New Task</Button>}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: 12, color: C.textFaint }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks..." style={{ ...inputStyle, paddingLeft: 34 }} />
        </div>
        <select style={{ ...inputStyle, width: "auto" }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option>All Statuses</option>
          {Object.keys(STATUS_META).map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <Card style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
            <thead>
              <tr style={{ background: C.bg, textAlign: "left" }}>
                <Th>Title</Th>
                <Th>Due Date</Th>
                <Th>Status</Th>
                <Th>Comments</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
                <tr key={t.id} onClick={() => setOpenTaskId(t.id)} style={{ borderTop: `1px solid ${C.border}`, cursor: "pointer" }}>
                  <Td><span style={{ fontWeight: 700, color: C.navy }}>{t.title}</span></Td>
                  <Td>{fmtDate(t.due_date)}</Td>
                  <Td><StatusPill status={t.status} /></Td>
                  <Td><TaskCommentCount taskId={t.id} supabase={supabase} /></Td>
                </tr>
              ))}
              {!loading && visible.length === 0 && (
                <tr><td colSpan={4} style={{ padding: 32, textAlign: "center", color: C.textFaint, fontSize: 14 }}>No tasks match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "12px 16px", fontSize: 12, color: C.textFaint, borderTop: `1px solid ${C.border}` }}>
          Showing {visible.length} of {tasks.length} results
        </div>
      </Card>

      {openTask && (
        <TaskDrawer
          task={openTask}
          profile={profile}
          client={client}
          supabase={supabase}
          isAgency={isAgency}
          onClose={() => {
            setOpenTaskId(null);
            router.replace(`/c/${clientId}/tasks`);
          }}
          onChanged={() => {
            load();
          }}
          notify={notify}
        />
      )}
      {showNewTask && (
        <NewTaskModal
          clientId={clientId}
          profile={profile}
          supabase={supabase}
          onClose={() => setShowNewTask(false)}
          onCreated={() => {
            setShowNewTask(false);
            notify("Task created");
            load();
          }}
        />
      )}
      <Toast message={toast} />
    </div>
  );
}

function Th({ children }) {
  return <th style={{ padding: "12px 16px", fontSize: 11, fontWeight: 700, color: C.textFaint, letterSpacing: 0.5, textTransform: "uppercase" }}>{children}</th>;
}
function Td({ children }) {
  return <td style={{ padding: "14px 16px", fontSize: 13.5, color: C.text }}>{children}</td>;
}

function TaskCommentCount({ taskId, supabase }) {
  const [count, setCount] = useState(null);
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("task_comments")
      .select("id", { count: "exact", head: true })
      .eq("task_id", taskId)
      .then(({ count: c }) => {
        if (!cancelled) setCount(c ?? 0);
      });
    return () => {
      cancelled = true;
    };
  }, [taskId, supabase]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, color: C.textFaint, fontSize: 13 }}>
      <MessageSquare size={13} /> {count ?? "..."}
    </div>
  );
}

function NewTaskModal({ clientId, profile, supabase, onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [script, setScript] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    await supabase.from("tasks").insert({
      client_id: clientId,
      title,
      due_date: dueDate,
      script: script || "Script coming soon.",
      shoot_notes: notes ? [{ title: "Notes", body: notes }] : [],
      project_code: "PL-" + Math.random().toString(36).slice(2, 7).toUpperCase(),
      created_by: profile.id,
    });
    setBusy(false);
    onCreated();
  }

  return (
    <Modal title="New Task" onClose={onClose} wide>
      <Field label="Title">
        <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Just Listed — 118 Oak St" />
      </Field>
      <Field label="Due Date">
        <input type="date" style={inputStyle} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </Field>
      <Field label="Teleprompter Script">
        <textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} value={script} onChange={(e) => setScript(e.target.value)} placeholder="Write the script the client will read on camera..." />
      </Field>
      <Field label="Shoot Notes (optional)">
        <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Framing, wardrobe, pacing..." />
      </Field>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button disabled={!title.trim() || busy} onClick={submit}>{busy ? "Creating..." : "Create Task"}</Button>
      </div>
    </Modal>
  );
}

function TaskDrawer({ task, profile, client, supabase, isAgency, onClose, onChanged, notify }) {
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [comment, setComment] = useState("");
  const [revisionMode, setRevisionMode] = useState(false);
  const [revisionText, setRevisionText] = useState("");
  const [localTask, setLocalTask] = useState(task);
  const fileRef = useRef(null);

  const loadDetail = useCallback(async () => {
    const { data: c } = await supabase.from("task_comments").select("*").eq("task_id", task.id).order("created_at");
    setComments(c || []);
    const { data: a } = await supabase.from("task_attachments").select("*").eq("task_id", task.id).order("created_at");
    setAttachments(a || []);
  }, [task.id, supabase]);

  useEffect(() => {
    setLocalTask(task);
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  async function refreshTask() {
    const { data } = await supabase.from("tasks").select("*").eq("id", task.id).single();
    if (data) setLocalTask(data);
    onChanged();
  }

  async function addComment(text) {
    await supabase.from("task_comments").insert({
      task_id: task.id, author_id: profile.id, author_name: profile.full_name, author_role: profile.role, body: text,
    });
    loadDetail();
  }

  async function requestRevision() {
    if (!revisionText.trim()) return;
    await supabase.from("tasks").update({ status: "Needs Revision", flagged: revisionText.trim() }).eq("id", task.id);
    await addComment(revisionText.trim());
    setRevisionText("");
    setRevisionMode(false);
    await refreshTask();
    notify("Revision requested");
  }

  async function approve() {
    await supabase.from("tasks").update({ status: "Approved" }).eq("id", task.id);
    await refreshTask();
    notify("Task approved");
  }

  async function markStatus(status) {
    await supabase.from("tasks").update({ status, flagged: status === "Needs Revision" ? localTask.flagged : null }).eq("id", task.id);
    await refreshTask();
    notify(`Marked as ${status}`);
  }

  async function handleFile(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const rows = files.map((f) => ({
      task_id: task.id, file_name: f.name, file_size: (f.size / 1e6).toFixed(1) + " MB", uploaded_by: profile.id,
    }));
    await supabase.from("task_attachments").insert(rows);
    if (localTask.status === "To Shoot") {
      await supabase.from("tasks").update({ status: "Submitted" }).eq("id", task.id);
    }
    await refreshTask();
    loadDetail();
    notify("File attached");
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", justifyContent: "flex-end" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(10,12,61,0.5)" }} onClick={onClose} />
      <div style={{ position: "relative", background: C.bg, width: "100%", maxWidth: 640, height: "100%", overflowY: "auto", fontFamily: FONT, boxShadow: "-8px 0 30px rgba(0,0,0,0.15)" }}>
        <div style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, padding: "16px 20px", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 2 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.navy, display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontFamily: FONT, fontSize: 14 }}>
            <ChevronLeft size={18} /> Back to Tasks
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {localTask.flagged && (
            <Card style={{ padding: 16, marginBottom: 16, borderLeft: `4px solid ${C.danger}`, background: "#FFF6F5" }}>
              <div style={{ display: "flex", gap: 10 }}>
                <AlertTriangle size={18} color={C.danger} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 700, color: C.danger, fontSize: 14, marginBottom: 4 }}>Needs Revision</div>
                  <p style={{ fontSize: 13, color: C.textMuted, margin: 0, lineHeight: 1.5 }}>{localTask.flagged}</p>
                </div>
              </div>
            </Card>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.textFaint, background: "#fff", border: `1px solid ${C.border}`, padding: "3px 8px", borderRadius: 4 }}>{localTask.type}</span>
                <span style={{ fontSize: 12, color: C.textFaint }}>Due {fmtDateFull(localTask.due_date)}</span>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: C.navy, margin: 0 }}>{localTask.title}</h2>
            </div>
            <StatusPill status={localTask.status} />
          </div>

          <div style={{ display: "flex", gap: 8, margin: "16px 0", flexWrap: "wrap" }}>
            {!isAgency && localTask.status === "Submitted" && <Button onClick={approve} icon={Check}>Approve</Button>}
            {!isAgency && !revisionMode && localTask.status !== "Needs Revision" && (
              <Button variant="secondary" onClick={() => setRevisionMode(true)}>Request Revision</Button>
            )}
            {!isAgency && <Button variant="ghost" icon={Upload} onClick={() => fileRef.current?.click()}>Record / Upload Take</Button>}
            {isAgency && (
              <>
                <select value={localTask.status} onChange={(e) => markStatus(e.target.value)} style={{ ...inputStyle, width: "auto", fontWeight: 700, fontSize: 13 }}>
                  {Object.keys(STATUS_META).map((s) => <option key={s}>{s}</option>)}
                </select>
                <Button variant="ghost" icon={Upload} onClick={() => fileRef.current?.click()}>Upload Assets</Button>
              </>
            )}
            <input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={handleFile} />
          </div>

          {revisionMode && (
            <Card style={{ padding: 16, marginBottom: 16 }}>
              <Field label="What needs to change?">
                <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={revisionText} onChange={(e) => setRevisionText(e.target.value)} placeholder="Describe what you'd like adjusted..." autoFocus />
              </Field>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Button variant="ghost" onClick={() => setRevisionMode(false)}>Cancel</Button>
                <Button onClick={requestRevision} disabled={!revisionText.trim()}>Submit Revision Request</Button>
              </div>
            </Card>
          )}

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: "2 1 320px", minWidth: 280 }}>
              <Card style={{ padding: 18, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <FileText size={16} color={C.teal} />
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: 0 }}>Teleprompter Script</h3>
                </div>
                <p style={{ fontSize: 16, lineHeight: 1.8, color: C.text, margin: 0 }}>{localTask.script}</p>
              </Card>

              {Array.isArray(localTask.shoot_notes) && localTask.shoot_notes.length > 0 && (
                <Card style={{ padding: 18, marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: "0 0 12px" }}>Shoot Instructions</h3>
                  {localTask.shoot_notes.map((n, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(26,35,126,0.08)", color: C.navy, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: C.text }}>{n.title}</div>
                        <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2, lineHeight: 1.5 }}>{n.body}</div>
                      </div>
                    </div>
                  ))}
                </Card>
              )}

              {attachments.length > 0 && (
                <Card style={{ padding: 18, marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: "0 0 12px" }}>Files</h3>
                  {attachments.map((a, i) => (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: i > 0 ? `1px solid ${C.border}` : "none" }}>
                      <Paperclip size={14} color={C.textFaint} />
                      <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{a.file_name}</span>
                      <span style={{ fontSize: 12, color: C.textFaint, marginLeft: "auto" }}>{a.file_size}</span>
                    </div>
                  ))}
                </Card>
              )}

              <Card style={{ padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <MessageSquare size={16} color={C.teal} />
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: 0 }}>Comments</h3>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
                  {comments.length === 0 && <p style={{ fontSize: 13, color: C.textFaint }}>No comments yet.</p>}
                  {comments.map((c) => (
                    <div key={c.id} style={{ display: "flex", gap: 10 }}>
                      <Avatar initials={c.author_name[0]} color={c.author_role === "client" ? C.teal : C.navy} size={26} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{c.author_name}</span>
                          <span style={{ fontSize: 11, color: C.textFaint }}>{new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        </div>
                        <p style={{ fontSize: 13, color: C.textMuted, margin: "2px 0 0", lineHeight: 1.5 }}>{c.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Leave a comment..."
                    onKeyDown={(e) => { if (e.key === "Enter" && comment.trim()) { addComment(comment.trim()); setComment(""); } }}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <Button onClick={() => { if (comment.trim()) { addComment(comment.trim()); setComment(""); } }}>Send</Button>
                </div>
              </Card>
            </div>

            <div style={{ flex: "1 1 220px", minWidth: 220 }}>
              <Card style={{ padding: 18 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: "0 0 14px" }}>Details</h3>
                <DetailRow label="Assigned To" value={localTask.assigned_to || "—"} />
                <DetailRow label="Project Code" value={<code style={{ background: C.bg, padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>{localTask.project_code}</code>} />
                {isAgency && <DetailRow label="Client" value={client.name} />}
                {localTask.tags?.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.textFaint, letterSpacing: 0.5, marginBottom: 6 }}>TARGET PLATFORMS</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {localTask.tags.map((tag, i) => (
                        <span key={i} style={{ fontSize: 11, background: C.bg, border: `1px solid ${C.border}`, padding: "3px 8px", borderRadius: 4, color: C.textMuted, fontWeight: 600 }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.textFaint, letterSpacing: 0.5 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 13.5, color: C.text, marginTop: 2, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
