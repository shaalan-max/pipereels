"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useWorkspace } from "@/lib/workspace-context";
import { C, Card, STATUS_META } from "@/lib/ui";

export default function CalendarPage() {
  const { clientId, supabase } = useWorkspace();
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [cursor, setCursor] = useState(new Date());

  const load = useCallback(async () => {
    const { data } = await supabase.from("tasks").select("*").eq("client_id", clientId);
    setTasks(data || []);
  }, [clientId, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const year = cursor.getFullYear(), month = cursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function tasksOn(day) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return tasks.filter((t) => t.due_date === iso);
  }
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ padding: "24px 20px 90px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.navy, margin: 0 }}>Content Calendar</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setCursor(new Date(year, month - 1, 1))} style={navBtnStyle}><ChevronLeft size={16} /></button>
          <span style={{ fontWeight: 700, color: C.navy, fontSize: 14, minWidth: 130, textAlign: "center" }}>
            {cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
          <button onClick={() => setCursor(new Date(year, month + 1, 1))} style={navBtnStyle}><ChevronRight size={16} /></button>
        </div>
      </div>

      <Card style={{ padding: 12, overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(90px,1fr))", gap: 6, minWidth: 630 }}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} style={{ fontSize: 11, fontWeight: 700, color: C.textFaint, textAlign: "center", padding: "6px 0" }}>{d}</div>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />;
            const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayTasks = tasksOn(day);
            const isToday = iso === todayIso;
            return (
              <div key={i} style={{ minHeight: 92, border: `1px solid ${C.border}`, borderRadius: 6, padding: 6, background: isToday ? "rgba(0,151,167,0.05)" : "#fff" }}>
                <div style={{
                  fontSize: 12, fontWeight: 700, marginBottom: 4, width: 20, height: 20, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: isToday ? C.teal : "transparent", color: isToday ? "#fff" : C.text,
                }}>{day}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {dayTasks.slice(0, 3).map((t) => (
                    <div
                      key={t.id}
                      onClick={() => router.push(`/c/${clientId}/tasks?open=${t.id}`)}
                      style={{
                        fontSize: 10.5, background: STATUS_META[t.status].bg, color: STATUS_META[t.status].fg,
                        padding: "2px 5px", borderRadius: 4, cursor: "pointer", overflow: "hidden",
                        textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600,
                      }}
                      title={t.title}
                    >
                      {t.title}
                    </div>
                  ))}
                  {dayTasks.length > 3 && <div style={{ fontSize: 10, color: C.textFaint }}>+{dayTasks.length - 3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
const navBtnStyle = { width: 30, height: 30, borderRadius: 6, border: `1px solid ${C.border}`, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
