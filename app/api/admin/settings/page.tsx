// app/admin/settings/page.tsx
"use client";

import { useEffect, useState } from "react";

type Row = { key: string; value?: string; isSecret: boolean; hasValue: boolean };

export default function SettingsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json()).then(setRows);
  }, []);

  const update = (i: number, v: string) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, value: v } : r));
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = rows
        .filter(r => r.value !== undefined) // only send editable items
        .map(r => ({ key: r.key, value: r.value }));
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setMsg("Saved!");
      setTimeout(() => setMsg(null), 1500);
      // refresh to update hasValue/masking
      const refreshed = await (await fetch("/api/admin/settings")).json();
      setRows(refreshed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="text-sm opacity-70">
        Paste your credentials here. Secrets are stored encrypted.
      </p>

      <div className="space-y-4">
        {rows.map((r, i) => (
          <div key={r.key} className="border rounded-xl p-4">
            <div className="text-sm font-mono">{r.key}</div>
            {r.isSecret ? (
              <input
                type="password"
                placeholder={r.hasValue ? "•••••• (configured)" : "Enter value"}
                className="mt-2 w-full border rounded-lg p-2"
                onChange={(e) => update(i, e.target.value)}
              />
            ) : (
              <input
                type="text"
                value={r.value ?? ""}
                placeholder="Enter value"
                className="mt-2 w-full border rounded-lg p-2"
                onChange={(e) => update(i, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="px-4 py-2 rounded-lg border shadow"
      >
        {saving ? "Saving..." : "Save settings"}
      </button>
      {msg && <div className="text-green-600">{msg}</div>}
    </main>
  );
}
