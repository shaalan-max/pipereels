"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Send, Lightbulb, Clock } from "lucide-react";
import { useWorkspace } from "@/lib/workspace-context";
import { C, FONT, Card, StatusPill, Avatar, fmtDate, inputStyle } from "@/lib/ui";

export default function HomePage() {
  const { profile, client, clientId, supabase } = useWorkspace();
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [ideaText, setIdeaText] = useState("");
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);

  const weekDays = useMemo(() => {
    const start = new Date();
    const day = start.getDay();
    const monday = new Date(start);
    monday.setDate(start.getDate() - ((day + 6) % 7));
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: taskRows } = await supabase
      .from("tasks")
      .select("*")
      .eq("client_id", clientId)
      .order("due_date");
    setTasks(taskRows || []);

    const { data: ideaRows } = await supabase
      .from("ideas")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    setIdeas(ideaRows || []);
    setLoading(false);
  }, [clientId, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function submitIdea() {
    if (!ideaText.trim()) return;
    const { error } = await supabase.from("ideas").insert({
      client_id: clientId,
      author_id: profile.id,
      author_name: profile.full_name,
      author_role: profile.role,
      tag: profile.role === "client" ? "Note" : "Internal",
      body: ideaText.trim(),
    });
    if (!error) {
      setIdeaText("");
      load();
    }
  }

  const dayTasks = tasks.filter((t) => t.due_date === selectedDay);
  const todayIso = new Date().toISOString().slice(0, 10);
  const upcoming = tasks.filter((t) => t.due_date >= todayIso).slice(0, 5);
  const rangeStart = fmtDate(weekDays[0]);
  const rangeEnd = fmtDate(weekDays[4]);

  return (
    <div style={{ padding: "24px 20px 90px" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: C.navy, margin: 0, letterSpacing: -0.5 }}>
          Hey {profile.full_name.split(" ")[0]}, here's your week
        </h1>
        <p style={{ color: C.textFaint, fontSize: 13, marginTop: 4 }}>{rangeStart} – {rangeEnd} · {client.name}</p>
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "2 1 480px", minWidth: 280 }}>
          <Card style={{ padding: 16, marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
              {weekDays.map((d) => {
                const dt = new Date(d + "T00:00:00");
                const has = tasks.some((t) => t.due_date === d);
                const isSelected = d === selectedDay;
                return (
                  <button
                    key={d}
                    onClick={() => setSelectedDay(d)}
                    style={{
                      flex: 1, minWidth: 64, padding: "10px 6px", borderRadius: 8, cursor: "pointer",
                      border: isSelected ? `1.5px solid ${C.navy}` : `1px solid ${C.border}`,
                      background: isSelected ? C.navy : "#fff", fontFamily: FONT, textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: isSelected ? "#B9C0F0" : C.textFaint }}>
                      {dt.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: isSelected ? "#fff" : C.text, marginTop: 2 }}>{dt.getDate()}</div>
                    {has && <div style={{ width: 5, height: 5, borderRadius: "50%", background: isSelected ? C.gold : C.teal, margin: "4px auto 0" }} />}
                  </button>
                );
              })}
            </div>
          </Card>

          {!loading && dayTasks.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {dayTasks.map((t) => <TaskCard key={t.id} task={t} onClick={() => router.push(`/c/${clientId}/tasks?open=${t.id}`)} />)}
            </div>
          )}
          {!loading && dayTasks.length === 0 && (
            <Card style={{ padding: 24, textAlign: "center", color: C.textFaint, fontSize: 14, marginBottom: 14 }}>
              Nothing due on {fmtDate(selectedDay)}. Here's what's coming up next:
            </Card>
          )}
          {!loading && dayTasks.length === 0 && upcoming.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {upcoming.map((t) => <TaskCard key={t.id} task={t} onClick={() => router.push(`/c/${clientId}/tasks?open=${t.id}`)} />)}
            </div>
          )}
        </div>

        <div style={{ flex: "1 1 280px", minWidth: 260 }}>
          <Card style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Lightbulb size={16} color={C.teal} />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: C.navy, margin: 0 }}>
                {profile.role === "client" ? "Notes to Your Team" : "Idea Box"}
              </h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 320, overflowY: "auto" }}>
              {ideas.length === 0 && <p style={{ fontSize: 13, color: C.textFaint }}>Nothing here yet.</p>}
              {ideas.map((idea) => (
                <div key={idea.id} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px" }}>
                  <p style={{ fontSize: 13, color: C.text, margin: 0, lineHeight: 1.5 }}>{idea.body}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    <span style={{ fontSize: 11, background: C.bg, color: C.textFaint, padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>{idea.tag}</span>
                    <span style={{ fontSize: 11, color: C.textFaint }}>{idea.author_name}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
              <input
                value={ideaText}
                onChange={(e) => setIdeaText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitIdea()}
                placeholder="Quick capture..."
                style={{ ...inputStyle, flex: 1, padding: "8px 10px", fontSize: 13 }}
              />
              <button onClick={submitIdea} style={{ background: "none", border: "none", cursor: "pointer", color: C.teal, display: "flex", alignItems: "center" }}>
                <Send size={18} />
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TaskCard({ task, onClick }) {
  return (
    <Card onClick={onClick} style={{ padding: 16, cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <StatusPill status={task.status} />
          <h4 style={{ fontSize: 15, fontWeight: 700, color: C.navy, margin: "8px 0 4px" }}>{task.title}</h4>
          <p style={{ fontSize: 13, color: C.textMuted, margin: 0, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {task.script}
          </p>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}`, color: C.textFaint, fontSize: 12 }}>
        <Clock size={13} /> Due {fmtDate(task.due_date)}
      </div>
    </Card>
  );
}
