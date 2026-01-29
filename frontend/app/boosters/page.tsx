"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import JourneyStepper from "@/components/JourneyStepper";
import { TopNav } from "@/components/top-nav";
import { apiFetch } from "@/lib/api";
import { getRouteForStep } from "@/config/onboardingFlow";

const CONTENT_OPTIONS = [
  "Reels / Short Videos",
  "Ad Creatives (Brand Promotions)",
  "Product Demo Videos",
  "Cinematic Videography",
  "Voice-over Videos",
  "UGC Style Ads",
  "Story Ads",
  "Static Posters / Thumbnails",
];

const SHOOTING_OPTIONS = [
  "Mobile (iPhone / Android)",
  "DSLR / Mirrorless",
  "Professional Camera Setup",
  "Studio / Indoor Setup",
  "Outdoor / Lifestyle Shoots",
];

const EDITING_TOOLS = [
  "CapCut",
  "Premiere Pro",
  "Final Cut Pro",
  "DaVinci Resolve",
  "VN / InShot",
  "Other",
];

const AD_EXPERIENCE = [
  "Yes, for brands",
  "Yes, self-promotions",
  "No, but open to it",
];

const AD_COUNT = ["1-5", "5-20", "20+"];

const AD_PLATFORMS = [
  "Instagram",
  "YouTube",
  "Facebook",
  "Shorts / Reels only",
  "Website / Landing Page",
  "App Promotion",
];

const BRAND_STRENGTHS = [
  "Clear product explanation",
  "High engagement",
  "Acting / Expression",
  "Creative storytelling",
  "CTA-focused ads",
  "Authentic UGC feel",
];

const PRICING_MODELS = [
  "Per Reel / Video",
  "Package Based",
  "Negotiable",
  "Depends on brand brief",
];

export default function BoostersPage() {
  const router = useRouter();
  const [contentCapabilities, setContentCapabilities] = useState<string[]>([]);
  const [shootingStyles, setShootingStyles] = useState<string[]>([]);
  const [editingSelf, setEditingSelf] = useState<boolean | null>(null);
  const [editingTools, setEditingTools] = useState<string[]>([]);
  const [editingOther, setEditingOther] = useState("");
  const [adExperience, setAdExperience] = useState("");
  const [adCountRange, setAdCountRange] = useState("");
  const [adPlatforms, setAdPlatforms] = useState<string[]>([]);
  const [brandStrengths, setBrandStrengths] = useState<string[]>([]);
  const [pricingModel, setPricingModel] = useState("");
  const [sampleLinks, setSampleLinks] = useState<string[]>([]);
  const [sampleInput, setSampleInput] = useState("");
  const [boostersConfirmed, setBoostersConfirmed] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [backHref, setBackHref] = useState("/creator/packages");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiFetch("/api/me");
        if (!active) return;
        const user = res?.user || {};
        const profile = user.influencerProfile || {};
        setContentCapabilities(Array.isArray(profile.contentCapabilities) ? profile.contentCapabilities : []);
        setShootingStyles(Array.isArray(profile.shootingStyles) ? profile.shootingStyles : []);
        if (typeof profile.editingSelf === "boolean") setEditingSelf(profile.editingSelf);
        setEditingTools(Array.isArray(profile.editingTools) ? profile.editingTools : []);
        setEditingOther(profile.editingOther || "");
        setAdExperience(profile.adExperience || "");
        setAdCountRange(profile.adCountRange || "");
        setAdPlatforms(Array.isArray(profile.adPlatforms) ? profile.adPlatforms : []);
        setBrandStrengths(Array.isArray(profile.brandStrengths) ? profile.brandStrengths : []);
        setPricingModel(profile.pricingModel || "");
        setSampleLinks(Array.isArray(profile.sampleLinks) ? profile.sampleLinks : []);
        if (typeof profile.boostersConfirmed === "boolean") setBoostersConfirmed(profile.boostersConfirmed);
        setBackHref(getRouteForStep(user.role, 8) || "/creator/packages");
      } catch {
        if (active) setBackHref("/creator/packages");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const toggleItem = (value: string, items: string[], setter: (v: string[]) => void) => {
    setter(items.includes(value) ? items.filter((item) => item !== value) : [...items, value]);
  };

  const canShowEditingTools = editingSelf === true;
  const showAdCount = adExperience === "Yes, for brands" || adExperience === "Yes, self-promotions";

  const cleanedSamples = useMemo(
    () => sampleLinks.map((link) => link.trim()).filter(Boolean),
    [sampleLinks]
  );

  const handleAddSample = () => {
    const trimmed = sampleInput.trim();
    if (!trimmed) return;
    if (cleanedSamples.includes(trimmed)) {
      setSampleInput("");
      return;
    }
    setSampleLinks((prev) => [...prev, trimmed]);
    setSampleInput("");
  };

  const handleRemoveSample = (idx: number) => {
    setSampleLinks((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    setError("");
    if (boostersConfirmed === null) {
      setError("Please confirm whether you want to complete the Boosters section.");
      return;
    }

    try {
      setSaving(true);
      await apiFetch("/api/influencer/profile", {
        method: "PATCH",
        body: JSON.stringify({
          contentCapabilities,
          shootingStyles,
          editingSelf,
          editingTools: canShowEditingTools ? editingTools : [],
          editingOther: canShowEditingTools ? editingOther.trim() || null : null,
          adExperience: adExperience || null,
          adCountRange: showAdCount ? adCountRange || null : null,
          adPlatforms,
          brandStrengths,
          pricingModel: pricingModel || null,
          sampleLinks: cleanedSamples,
          boostersConfirmed,
          onboardingStep: 9,
        }),
      });
      await apiFetch("/api/onboarding/complete", {
        method: "POST",
        body: JSON.stringify({}),
      });
      router.push("/listings");
    } catch (e: any) {
      setError(e?.message || "Failed to save Boosters details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-emerald-50 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      <TopNav />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white/90 dark:bg-zinc-950/90 rounded-2xl shadow-lg border border-slate-200/60 dark:border-zinc-800 p-6 md:p-8">
          <JourneyStepper />

          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-zinc-100">
            Improve Your Deal Success (Optional but Powerful)
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
            Creators who complete this section get up to 70% higher chances of closing deals and better pricing.
          </p>

          <div className="mt-8 space-y-8">
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">Boosters Completion</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Select Yes or No to confirm this step and unlock 100% onboarding.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setBoostersConfirmed(true)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold border ${
                    boostersConfirmed === true
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "border-slate-200 text-slate-600 dark:border-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  Yes, I will complete this
                </button>
                <button
                  type="button"
                  onClick={() => setBoostersConfirmed(false)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold border ${
                    boostersConfirmed === false
                      ? "bg-slate-900 text-white border-slate-900"
                      : "border-slate-200 text-slate-600 dark:border-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  No, not right now
                </button>
              </div>
            </section>

            {boostersConfirmed === true && (
              <>
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">
                Content Capability (What can you actually create?)
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Brands filter creators by content type first.
              </p>
              <div className="flex flex-wrap gap-2">
                {CONTENT_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleItem(option, contentCapabilities, setContentCapabilities)}
                    className={`px-3 py-2 rounded-full text-xs font-medium border transition ${
                      contentCapabilities.includes(option)
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-800"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">
                Shooting & Production Style
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Brands prefer clarity on production quality.</p>
              <div className="flex flex-wrap gap-2">
                {SHOOTING_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleItem(option, shootingStyles, setShootingStyles)}
                    className={`px-3 py-2 rounded-full text-xs font-medium border transition ${
                      shootingStyles.includes(option)
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-800"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">
                Editing & Tools
              </h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingSelf(true)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold border ${
                    editingSelf === true
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "border-slate-200 text-slate-600 dark:border-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingSelf(false)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold border ${
                    editingSelf === false
                      ? "bg-slate-900 text-white border-slate-900"
                      : "border-slate-200 text-slate-600 dark:border-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  No
                </button>
              </div>
              {canShowEditingTools && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Brands pay more when creator handles end-to-end.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {EDITING_TOOLS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggleItem(option, editingTools, setEditingTools)}
                        className={`px-3 py-2 rounded-full text-xs font-medium border transition ${
                          editingTools.includes(option)
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-800"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  {editingTools.includes("Other") && (
                    <input
                      value={editingOther}
                      onChange={(e) => setEditingOther(e.target.value)}
                      placeholder="Other editing tools"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  )}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">Ad Experience</h2>
              <div className="flex flex-wrap gap-2">
                {AD_EXPERIENCE.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setAdExperience(option)}
                    className={`px-3 py-2 rounded-full text-xs font-medium border transition ${
                      adExperience === option
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-800"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {showAdCount && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Approx number of ads created?</p>
                  <div className="flex flex-wrap gap-2">
                    {AD_COUNT.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setAdCountRange(option)}
                        className={`px-3 py-2 rounded-full text-xs font-medium border transition ${
                          adCountRange === option
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-800"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">
                Platforms You Can Create Ads For
              </h2>
              <div className="flex flex-wrap gap-2">
                {AD_PLATFORMS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleItem(option, adPlatforms, setAdPlatforms)}
                    className={`px-3 py-2 rounded-full text-xs font-medium border transition ${
                      adPlatforms.includes(option)
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-800"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">
                Brand-Friendly Strengths
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                This helps brand confidence instantly.
              </p>
              <div className="flex flex-wrap gap-2">
                {BRAND_STRENGTHS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleItem(option, brandStrengths, setBrandStrengths)}
                    className={`px-3 py-2 rounded-full text-xs font-medium border transition ${
                      brandStrengths.includes(option)
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-800"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">
                Pricing Confidence
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                This helps brands approach you with the right budget.
              </p>
              <div className="flex flex-wrap gap-2">
                {PRICING_MODELS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setPricingModel(option)}
                    className={`px-3 py-2 rounded-full text-xs font-medium border transition ${
                      pricingModel === option
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-800"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">
                Sample Work (Optional)
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Profiles with samples get faster responses from brands.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={sampleInput}
                  onChange={(e) => setSampleInput(e.target.value)}
                  placeholder="Paste Drive / YouTube / Instagram link"
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                />
                <button
                  type="button"
                  onClick={handleAddSample}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold"
                >
                  Add link
                </button>
              </div>
              <div className="space-y-2">
                {cleanedSamples.length === 0 ? (
                  <div className="text-xs text-slate-500 dark:text-zinc-400">No sample links added.</div>
                ) : (
                  cleanedSamples.map((link, idx) => (
                    <div key={`${link}-${idx}`} className="flex items-center justify-between gap-3">
                      <div className="text-xs text-slate-600 dark:text-zinc-300 break-all">{link}</div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSample(idx)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-100">
              Why complete this section?
              <div className="mt-2 text-xs text-emerald-800/90 dark:text-emerald-200">
                Brands prefer creators who clearly mention their videography and ad-creation capabilities. Completing this section can
                increase your deal chances by up to 70% and help you command higher pricing.
              </div>
            </div>
              </>
            )}

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <a href={backHref} className="text-sm text-slate-500 dark:text-zinc-400 hover:underline">
                Back
              </a>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className={`w-full sm:w-auto px-6 py-3 rounded-xl text-white font-semibold transition ${
                  saving ? "bg-slate-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {saving ? "Saving..." : "Finish onboarding"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
