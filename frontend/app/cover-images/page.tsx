"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import JourneyStepper from "@/components/JourneyStepper";
import { TopNav } from "@/components/top-nav";
import { getRouteForStep } from "@/config/onboardingFlow";

const MAX_COVER_IMAGES = 2;

export default function CoverImagesPage() {
  const router = useRouter();
  const [coverImages, setCoverImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [backHref, setBackHref] = useState("/summary");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const meRes = await apiFetch("/api/me");
        if (!active) return;
        const user = meRes?.user || {};
        const media = Array.isArray(user.influencerMedia) ? user.influencerMedia : [];
        const existing = media
          .filter((item: any) => item.type === "COVER")
          .map((item: any) => String(item.url || ""))
          .filter(Boolean);
        setCoverImages(existing);
        setBackHref(getRouteForStep(user.role, 5) || "/summary");
      } catch {
        if (active) setBackHref("/summary");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const removeCoverImage = (idx: number) => {
    setCoverImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handlePickFiles = () => {
    if (coverImages.length >= MAX_COVER_IMAGES) return;
    fileInputRef.current?.click();
  };

  const uploadFile = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

    const res = await apiFetch("/api/uploads/image", {
      method: "POST",
      body: JSON.stringify({ dataUrl, folder: "influencer/cover" }),
    });

    return res.url as string;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setError("");
    setUploading(true);
    try {
      const remaining = MAX_COVER_IMAGES - coverImages.length;
      const batch = files.slice(0, remaining);
      const urls: string[] = [];
      for (const file of batch) {
        const url = await uploadFile(file);
        urls.push(url);
      }
      setCoverImages((prev) => [...prev, ...urls]);
    } catch (err: any) {
      setError(err?.message || "Failed to upload image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleContinue = async () => {
    setError("");
    const cleaned = coverImages.map((url) => url.trim()).filter(Boolean);
    if (cleaned.length === 0) {
      setError("Add at least one cover image URL to continue.");
      return;
    }
    if (cleaned.length > MAX_COVER_IMAGES) {
      setError(`You can add up to ${MAX_COVER_IMAGES} cover images.`);
      return;
    }

    try {
      setSaving(true);
      await apiFetch("/api/influencer/media", {
        method: "PUT",
        body: JSON.stringify({
          coverImages: cleaned,
          onboardingStep: 6,
        }),
      });
      router.push("/portfolio");
    } catch (e: any) {
      setError(e?.message || "Failed to save cover images");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-zinc-950 dark:to-zinc-900">
      <TopNav />
      <div className="flex flex-col items-center justify-center py-8 px-4">
        <div className="w-full max-w-md bg-white dark:bg-zinc-950 rounded-lg shadow-lg p-8">
        <JourneyStepper />

        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-2 text-left">
          Add cover images
        </h1>
        <p className="text-sm text-gray-600 dark:text-zinc-400 mb-6">
          Add up to {MAX_COVER_IMAGES} cover images to highlight your profile.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="space-y-3">
          {coverImages.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-zinc-400">
              No cover images uploaded yet.
            </div>
          ) : (
            coverImages.map((url, idx) => (
              <div key={`${idx}-${url}`} className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Cover ${idx + 1}`}
                  className="h-16 w-24 rounded-lg object-cover border border-gray-200 dark:border-zinc-800"
                />
                <div className="flex-1 text-xs text-gray-500 dark:text-zinc-400 break-all">
                  {url}
                </div>
                <button
                  type="button"
                  onClick={() => removeCoverImage(idx)}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={handlePickFiles}
            disabled={coverImages.length >= MAX_COVER_IMAGES || uploading}
            className="text-indigo-600 font-medium hover:underline disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "+ Add from device"}
          </button>
          <a href={backHref} className="text-gray-500 dark:text-zinc-400 hover:underline">
            Back
          </a>
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <button
          onClick={handleContinue}
          disabled={saving}
          className={`mt-6 w-full py-3 text-white font-semibold rounded-lg transition ${
            saving ? "bg-gray-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {saving ? "Saving..." : "Continue"}
        </button>
        </div>
      </div>
    </div>
  );
}
