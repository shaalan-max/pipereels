"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Film, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { C, FONT, Card } from "@/lib/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError("Incorrect email or password. Please try again.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(160deg, ${C.navyDark} 0%, ${C.navy} 55%, #232C8F 100%)`,
        display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, padding: 20,
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 56, height: 56, borderRadius: 12, background: C.gold, margin: "0 auto 16px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Film size={28} color="#fff" />
          </div>
          <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 700, letterSpacing: -0.5, margin: 0 }}>Pipelooms</h1>
          <p style={{ color: "#B9C0F0", fontSize: 14, marginTop: 6 }}>Sign in to your portal</p>
        </div>

        <Card style={{ padding: 24, background: "#fff" }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                style={{
                  width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 6,
                  border: `1px solid ${C.borderStrong}`, fontSize: 14, fontFamily: FONT, outline: "none",
                }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 6,
                  border: `1px solid ${C.borderStrong}`, fontSize: 14, fontFamily: FONT, outline: "none",
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 8, background: C.dangerBg, color: C.danger,
                  fontSize: 13, fontWeight: 600, padding: "10px 12px", borderRadius: 6, marginBottom: 16,
                }}
              >
                <AlertCircle size={15} /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", background: C.gold, color: "#fff", fontWeight: 700, fontSize: 14,
                border: "none", borderRadius: 6, padding: "12px 18px", cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.6 : 1, fontFamily: FONT,
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </Card>
        <p style={{ textAlign: "center", color: "#8E96D9", fontSize: 12, marginTop: 16 }}>
          Forgot your password? Contact your account admin.
        </p>
      </div>
    </div>
  );
}
