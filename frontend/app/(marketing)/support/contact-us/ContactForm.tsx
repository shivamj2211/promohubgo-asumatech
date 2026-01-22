"use client";

import { useMemo, useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"Brand" | "Influencer" | "Other">("Other");
  const [message, setMessage] = useState("");

  // honeypot
  const [company, setCompany] = useState("");

  const canSubmit = useMemo(() => {
    return (
      name.trim().length >= 2 &&
      email.includes("@") &&
      message.trim().length >= 10 &&
      status !== "submitting"
    );
  }, [name, email, message, status]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("submitting");

    try {
      const res = await fetch("/api/support/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, message, company }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to send message");
      }

      setStatus("success");
      setName("");
      setEmail("");
      setRole("Other");
      setMessage("");

      // auto-hide success toast after a bit
      setTimeout(() => setStatus("idle"), 4000);
    } catch (err: any) {
      setStatus("error");
      setError(err?.message || "Something went wrong");
      setTimeout(() => setStatus("idle"), 5000);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-zinc-800">
      {/* Toast */}
      {status === "success" && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          Message sent! We’ll get back to you soon.
        </div>
      )}
      {status === "error" && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          {error || "Could not send message."}
        </div>
      )}

      <form onSubmit={onSubmit} className="grid gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="rounded-lg border border-slate-200 bg-white p-2 text-sm outline-none focus:ring-2 focus:ring-slate-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:ring-zinc-700"
        />

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          className="rounded-lg border border-slate-200 bg-white p-2 text-sm outline-none focus:ring-2 focus:ring-slate-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:ring-zinc-700"
        />

        <select
          value={role}
          onChange={(e) => setRole(e.target.value as any)}
          className="rounded-lg border border-slate-200 bg-white p-2 text-sm outline-none focus:ring-2 focus:ring-slate-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:ring-zinc-700"
        >
          <option>Brand</option>
          <option>Influencer</option>
          <option>Other</option>
        </select>

        {/* Honeypot - keep hidden */}
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          placeholder="Company"
          className="hidden"
        />

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe your issue"
          className="min-h-[140px] rounded-lg border border-slate-200 bg-white p-2 text-sm outline-none focus:ring-2 focus:ring-slate-300 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:ring-zinc-700"
        />

        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900"
        >
          {status === "submitting" ? "Sending..." : "Send message"}
        </button>
      </form>
    </div>
  );
}
