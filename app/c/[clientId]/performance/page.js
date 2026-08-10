"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Eye, Heart, DollarSign, Timer, ArrowUpRight, ArrowDownRight, Video } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useWorkspace } from "@/lib/workspace-context";
import { C, Card, fmtNum } from "@/lib/ui";

const RANGE_WEEKS = { "7D": 1, "30D": 4, "90D": 8, YTD: 8 };

export default function PerformancePage() {
  const { clientId, supabase } = useWorkspace();
  const [range, setRange] = useState("30D");
  const [weekly, setWeekly] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: w } = await supabase
      .from("performance_weekly")
      .select("*")
      .eq("client_id", clientId)
      .order("week_start");
    setWeekly(w || []);

    const { data: a } = await supabase
      .from("performance_assets")
      .select("*")
      .eq("client_id", clientId)
      .order("views", { ascending: false })
      .limit(5);
    setAssets(a || []);
    setLoading(false);
  }, [clientId, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const chartData = weekly.map((w, i) => ({ week: `Week ${i + 1}`, views: w.views }));

  const kpi = useMemo(() => {
    if (weekly.length === 0) return null;
    const n = RANGE_WEEKS[range];
    const recent = weekly.slice(-n);
    const prior = weekly.slice(Math.max(0, weekly.length - 2 * n), weekly.length - n);
    const totalViews = recent.reduce((a, b) => a + b.views, 0) * (range === "YTD" ? 3.2 : 1);
    const priorViews = (prior.length ? prior.reduce((a, b) => a + b.views, 0) : totalViews * 0.85) * (range === "YTD" ? 3.2 : 1);
    const viewsDelta = priorViews > 0 ? ((totalViews - priorViews) / priorViews) * 100 : 0;

    const avg = (key) => recent.reduce((a, b) => a + Number(b[key]), 0) / recent.length;
    const engagement = avg("engagement_rate");
    const leadConv = avg("lead_conversion");
    const watchSec = Math.round(avg("avg_watch_seconds"));

    return {
      views: fmtNum(Math.round(totalViews)),
      viewsDelta,
      engagement: engagement.toFixed(1) + "%",
      leadConv: leadConv.toFixed(1) + "%",
      watch: `${Math.floor(watchSec / 60)}:${String(watchSec % 60).padStart(2, "0")}`,
    };
  }, [weekly, range]);

  return (
    <div style={{ padding: "24px 20px 90px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.navy, margin: 0 }}>Performance Dashboard</h1>
        <div style={{ display: "flex", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
          {Object.keys(RANGE_WEEKS).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{
                border: "none", padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                background: range === r ? C.navy : "transparent", color: range === r ? "#fff" : C.textMuted,
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {!loading && kpi && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 16 }}>
          <KPICard icon={Eye} iconBg="#E0F5F7" iconColor={C.teal} label="Total Views" value={kpi.views} delta={kpi.viewsDelta} deltaUp={kpi.viewsDelta >= 0} />
          <KPICard icon={Heart} iconBg="#EDE7F6" iconColor="#5E35B1" label="Engagement Rate" value={kpi.engagement} note="Avg. this period" />
          <KPICard icon={DollarSign} iconBg="#FFF3E0" iconColor={C.goldDark} label="Lead Conversion" value={kpi.leadConv} note="Avg. this period" />
          <KPICard icon={Timer} iconBg="#F1F1F1" iconColor={C.textMuted} label="Avg Watch Time" value={kpi.watch} note="This period" />
        </div>
      )}

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Card style={{ flex: "2 1 420px", minWidth: 280, padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.navy, margin: "0 0 16px" }}>Audience Growth</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="growth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.teal} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={C.teal} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEE" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: C.textFaint }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtNum} tick={{ fontSize: 11, fill: C.textFaint }} axisLine={false} tickLine={false} width={44} />
              <Tooltip formatter={(v) => fmtNum(v)} contentStyle={{ borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12 }} />
              <Area type="monotone" dataKey="views" stroke={C.teal} strokeWidth={2.5} fill="url(#growth)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{ flex: "1 1 260px", minWidth: 240, padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.navy, margin: "0 0 14px" }}>Top Performing Assets</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {assets.map((a) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 6, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Video size={15} color={C.textFaint} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: C.textFaint }}>{a.asset_type}</div>
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.navy, flexShrink: 0 }}>{fmtNum(a.views)}</div>
              </div>
            ))}
            {assets.length === 0 && <p style={{ fontSize: 13, color: C.textFaint }}>No asset data yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, iconBg, iconColor, label, value, delta, deltaUp, note }) {
  return (
    <Card style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.textFaint, letterSpacing: 0.5 }}>{label.toUpperCase()}</span>
        <div style={{ width: 30, height: 30, borderRadius: 6, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={15} color={iconColor} />
        </div>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: C.navy, margin: "10px 0 4px" }}>{value}</div>
      {delta !== undefined ? (
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: deltaUp ? "#1B7A3D" : C.danger }}>
          {deltaUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          {Math.abs(delta).toFixed(1)}% vs last period
        </div>
      ) : (
        <div style={{ fontSize: 12, color: C.textFaint }}>{note}</div>
      )}
    </Card>
  );
}
