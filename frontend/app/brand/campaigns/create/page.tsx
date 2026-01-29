"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Requirements = {
  categories: string[];
  locations: string[];
  languages: string[];
  minFollowers: number | null;
  maxFollowers: number | null;
  minEngagement: number | null;
  gender: string | null;
};

function chipParse(text: string) {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function StepPill({ active, done, children }: any) {
  return (
    <div
      className={[
        "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
        active ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300" : "",
        done ? "border-slate-200 bg-slate-50 text-slate-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200" : "",
        !active && !done ? "border-slate-200 text-slate-500 dark:border-zinc-800 dark:text-zinc-500" : "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export default function CreateCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form state
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("awareness");
  const [description, setDescription] = useState("");

  const [platform, setPlatform] = useState<"instagram" | "youtube" | "both">("instagram");
  const [contentTypes, setContentTypes] = useState<string[]>(["reel"]);

  const [req, setReq] = useState<Requirements>({
    categories: [],
    locations: [],
    languages: [],
    minFollowers: null,
    maxFollowers: null,
    minEngagement: null,
    gender: null,
  });

  const [budgetType, setBudgetType] = useState<"fixed" | "total">("fixed");
  const [minBudget, setMinBudget] = useState<number | null>(null);
  const [maxBudget, setMaxBudget] = useState<number | null>(null);

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const canNext = useMemo(() => {
    if (step === 1) return name.trim().length >= 3;
    if (step === 2) return platform && contentTypes.length > 0;
    if (step === 3) return true;
    if (step === 4) return true;
    if (step === 5) return true;
    return true;
  }, [step, name, platform, contentTypes]);

  function toggleType(t: string) {
    setContentTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function createDraft() {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name,
        objective,
        description: description || null,
        platform,
        contentTypes,
        budgetType,
        minBudget,
        maxBudget,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        requirements: req,
      };
      // ✅ basic validations (no hard blocks, just safe)
if (minBudget !== null && maxBudget !== null && minBudget > maxBudget) {
  throw new Error("Min budget cannot be greater than max budget.");
}
if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
  throw new Error("Start date cannot be after end date.");
}
if (req.minFollowers !== null && req.maxFollowers !== null && req.minFollowers > req.maxFollowers) {
  throw new Error("Min followers cannot be greater than max followers.");
}

      const res = await fetch("/api/brand/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Failed to create campaign");

      const id = json.campaign?.id;
      if (!id) throw new Error("Campaign id missing");

      // publish immediately if you want: we keep draft by default (premium feel: preview -> publish)
      return id as string;
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
      return null;
    } finally {
      setSubmitting(false);
    }
  }

  async function publishNow(campaignId: string) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/brand/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "live" }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Failed to publish");
      router.push(`/brand/campaigns/${campaignId}`);
    } catch (e: any) {
      setError(e?.message || "Publish failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold">Create Campaign</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
              Smooth campaign setup (Collabstr-style). You’ll publish after preview.
            </p>
          </div>
          <Link href="/brand/campaigns" className="text-sm font-semibold text-emerald-600 hover:underline">
            ← Back to campaigns
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <StepPill active={step === 1} done={step > 1}>1 · Basics</StepPill>
          <StepPill active={step === 2} done={step > 2}>2 · Platform</StepPill>
          <StepPill active={step === 3} done={step > 3}>3 · Requirements</StepPill>
          <StepPill active={step === 4} done={step > 4}>4 · Budget</StepPill>
          <StepPill active={step === 5} done={step > 5}>5 · Timeline</StepPill>
          <StepPill active={step === 6} done={false}>6 · Preview</StepPill>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-white p-6 text-sm text-red-700 dark:border-red-900 dark:bg-zinc-950 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {/* Step Panels */}
      {step === 1 ? (
        <Panel title="Campaign basics" subtitle="Make it clear so creators instantly understand your goal.">
          <Field label="Campaign name" hint="Example: Valentine Launch · Summer Sale · New App Install">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 dark:border-zinc-800 dark:bg-zinc-950"
              placeholder="e.g. Valentine Launch"
            />
          </Field>

          <Field label="Objective">
            <select
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="awareness">Awareness</option>
              <option value="sales">Sales</option>
              <option value="ugc">UGC content</option>
              <option value="installs">App installs</option>
            </select>
          </Field>

          <Field label="Description" hint="Short brief: what you sell + what you want + tone + CTA">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 dark:border-zinc-800 dark:bg-zinc-950"
              placeholder="We are launching… We need 1 Reel + 2 Stories… CTA: link in bio…"
            />
          </Field>
        </Panel>
      ) : null}

      {step === 2 ? (
        <Panel title="Platform & content type" subtitle="Controls discovery and recommended creators.">
          <Field label="Platform">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <RadioCard active={platform === "instagram"} onClick={() => setPlatform("instagram")} title="Instagram" desc="Reels, Stories, Posts" />
              <RadioCard active={platform === "youtube"} onClick={() => setPlatform("youtube")} title="YouTube" desc="Shorts, Videos" />
              <RadioCard active={platform === "both"} onClick={() => setPlatform("both")} title="Both" desc="Multi-platform campaigns" />
            </div>
          </Field>

          <Field label="Content types" hint="Select all that apply">
            <div className="flex flex-wrap gap-2">
              {["reel", "story", "post", "short", "video"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleType(t)}
                  className={[
                    "rounded-full border px-4 py-2 text-sm font-semibold",
                    contentTypes.includes(t)
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900",
                  ].join(" ")}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </Field>
        </Panel>
      ) : null}

      {step === 3 ? (
        <Panel title="Creator requirements" subtitle="This creates Collabstr-style matching suggestions.">
          <Field label="Categories" hint="Comma separated: fashion, tech, fitness...">
            <input
              defaultValue={req.categories.join(", ")}
              onBlur={(e) => setReq((p) => ({ ...p, categories: chipParse(e.target.value) }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 dark:border-zinc-800 dark:bg-zinc-950"
              placeholder="fashion, beauty"
            />
          </Field>

          <Field label="Locations" hint="Comma separated: mumbai, delhi, gujarat...">
            <input
              defaultValue={req.locations.join(", ")}
              onBlur={(e) => setReq((p) => ({ ...p, locations: chipParse(e.target.value) }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 dark:border-zinc-800 dark:bg-zinc-950"
              placeholder="mumbai, delhi"
            />
          </Field>

          <Field label="Languages" hint="Comma separated: hindi, english...">
            <input
              defaultValue={req.languages.join(", ")}
              onBlur={(e) => setReq((p) => ({ ...p, languages: chipParse(e.target.value) }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 dark:border-zinc-800 dark:bg-zinc-950"
              placeholder="hindi, english"
            />
          </Field>

          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Min followers">
              <input
                type="number"
                value={req.minFollowers ?? ""}
                onChange={(e) => setReq((p) => ({ ...p, minFollowers: e.target.value ? Number(e.target.value) : null }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 dark:border-zinc-800 dark:bg-zinc-950"
                placeholder="10000"
              />
            </Field>
            <Field label="Max followers">
              <input
                type="number"
                value={req.maxFollowers ?? ""}
                onChange={(e) => setReq((p) => ({ ...p, maxFollowers: e.target.value ? Number(e.target.value) : null }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 dark:border-zinc-800 dark:bg-zinc-950"
                placeholder="500000"
              />
            </Field>
            <Field label="Min engagement (%)">
              <input
                type="number"
                value={req.minEngagement ?? ""}
                onChange={(e) => setReq((p) => ({ ...p, minEngagement: e.target.value ? Number(e.target.value) : null }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 dark:border-zinc-800 dark:bg-zinc-950"
                placeholder="2.5"
              />
            </Field>
          </div>
        </Panel>
      ) : null}

      {step === 4 ? (
        <Panel title="Budget & pricing" subtitle="Clear budgets increase creator acceptance rate.">
          <Field label="Budget type">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <RadioCard active={budgetType === "fixed"} onClick={() => setBudgetType("fixed")} title="Fixed per creator" desc="You pay each creator in a range" />
              <RadioCard active={budgetType === "total"} onClick={() => setBudgetType("total")} title="Total budget" desc="Overall budget you want to spend" />
            </div>
          </Field>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Min budget (₹)">
              <input
                type="number"
                value={minBudget ?? ""}
                onChange={(e) => setMinBudget(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 dark:border-zinc-800 dark:bg-zinc-950"
                placeholder="5000"
              />
            </Field>
            <Field label="Max budget (₹)">
              <input
                type="number"
                value={maxBudget ?? ""}
                onChange={(e) => setMaxBudget(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 dark:border-zinc-800 dark:bg-zinc-950"
                placeholder="20000"
              />
            </Field>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-600 dark:border-zinc-800 dark:text-zinc-400">
            Premium tip: Once campaign is live, you can invite creators directly from suggestions.
          </div>
        </Panel>
      ) : null}

      {step === 5 ? (
        <Panel title="Timeline" subtitle="Professional campaigns have clear dates.">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Start date">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 dark:border-zinc-800 dark:bg-zinc-950"
              />
            </Field>
            <Field label="End date">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 dark:border-zinc-800 dark:bg-zinc-950"
              />
            </Field>
          </div>
        </Panel>
      ) : null}

      {step === 6 ? (
        <Panel title="Preview & publish" subtitle="Final review before your campaign goes live.">
          <div className="grid gap-4 md:grid-cols-2">
            <SummaryCard title="Basics">
              <Row k="Name" v={name || "—"} />
              <Row k="Objective" v={objective} />
              <Row k="Platform" v={platform} />
              <Row k="Content types" v={contentTypes.join(", ") || "—"} />
            </SummaryCard>

            <SummaryCard title="Requirements">
              <Row k="Categories" v={req.categories.join(", ") || "Any"} />
              <Row k="Locations" v={req.locations.join(", ") || "Any"} />
              <Row k="Languages" v={req.languages.join(", ") || "Any"} />
              <Row k="Followers" v={`${req.minFollowers ?? "—"} to ${req.maxFollowers ?? "—"}`} />
            </SummaryCard>

            <SummaryCard title="Budget">
              <Row k="Type" v={budgetType} />
              <Row k="Range" v={`${minBudget ?? "—"} to ${maxBudget ?? "—"}`} />
            </SummaryCard>

            <SummaryCard title="Timeline">
              <Row k="Start" v={startDate || "—"} />
              <Row k="End" v={endDate || "—"} />
            </SummaryCard>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              disabled={submitting || !name.trim()}
              onClick={async () => {
                const id = await createDraft();
                if (id) await publishNow(id);
              }}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {submitting ? "Publishing..." : "Publish campaign"}
            </button>

            <button
              disabled={submitting || !name.trim()}
              onClick={async () => {
                const id = await createDraft();
                if (id) router.push(`/brand/campaigns/${id}`);
              }}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-extrabold hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900 disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save as draft"}
            </button>
          </div>
        </Panel>
      ) : null}

      {/* Footer nav */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={step === 1 || submitting}
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900 disabled:opacity-50"
        >
          Back
        </button>

        <button
          type="button"
          disabled={!canNext || submitting}
          onClick={() => setStep((s) => Math.min(6, s + 1))}
          className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-extrabold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children }: any) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-extrabold">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">{subtitle}</p> : null}
      <div className="mt-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: any) {
  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold">{label}</p>
        {hint ? <p className="text-xs text-slate-500 dark:text-zinc-500">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

function RadioCard({ active, onClick, title, desc }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-2xl border p-4 text-left",
        active
          ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
          : "border-slate-200 hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900",
      ].join(" ")}
    >
      <p className="text-sm font-extrabold">{title}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">{desc}</p>
    </button>
  );
}

function SummaryCard({ title, children }: any) {
  return (
    <div className="rounded-2xl border border-slate-200 p-5 dark:border-zinc-800">
      <p className="text-sm font-extrabold">{title}</p>
      <div className="mt-3 space-y-2 text-sm">{children}</div>
    </div>
  );
}

function Row({ k, v }: any) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-slate-500 dark:text-zinc-500">{k}</span>
      <span className="font-semibold text-right">{String(v)}</span>
    </div>
  );
}
