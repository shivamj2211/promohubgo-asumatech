"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type SavedSearch = {
  id: string;
  type: "influencer" | "brand";
  name?: string | null;
  slug?: string | null;
  tags?: string[];
  params: any;
  createdAt?: string;
  updatedAt?: string;
};

type Me = { id: string; role?: string | null };

function normalizeTags(input: string | string[]) {
  const arr = Array.isArray(input)
    ? input
    : String(input || "")
        .split(",")
        .map((s) => s.trim());

  const cleaned = arr
    .map((t) => String(t || "").trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((t) => t.slice(0, 24));

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const t of cleaned) {
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(t);
  }
  return unique;
}

function TagsEditor({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (next: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function addFromInput() {
    const next = normalizeTags([...tags, ...normalizeTags(input)]);
    onChange(next);
    setInput("");
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <button
            key={t}
            onClick={() => onChange(tags.filter((x) => x !== t))}
            className="rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-1 text-xs font-extrabold hover:bg-slate-50 dark:hover:bg-zinc-900"
            title="Remove tag"
          >
            #{t} <span className="opacity-60 ml-1">✕</span>
          </button>
        ))}
      </div>

      <div className="mt-2 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add tags (comma separated)"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addFromInput();
            }
          }}
          className="flex-1 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-sm outline-none"
        />
        <button
          onClick={addFromInput}
          className="rounded-2xl bg-slate-900 text-white px-4 py-2 text-sm font-extrabold hover:bg-slate-800"
        >
          Add
        </button>
      </div>

      <p className="mt-1 text-[12px] text-slate-500 dark:text-zinc-400">
        Tip: press Enter to add. Max 12 tags.
      </p>
    </div>
  );
}

export default function SavedSearchesPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [items, setItems] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Tag filter
  const [activeTag, setActiveTag] = useState<string>("");

  // edit modal
  const [edit, setEdit] = useState<SavedSearch | null>(null);
  const [editName, setEditName] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [meRes, savedRes] = await Promise.all([
        apiFetch("/api/me"),
        apiFetch("/api/saved-searches"),
      ]);
      setMe(meRes?.user || null);
      setItems(Array.isArray(savedRes?.data) ? savedRes.data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const isBrand = useMemo(() => (me?.role || "") === "BRAND", [me]);

  // ✅ Build tag chips with counts (Gmail-like)
  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of items) {
      const ts = Array.isArray(s.tags) ? s.tags : [];
      for (const t of ts) {
        const key = String(t || "").trim();
        if (!key) continue;
        map.set(key, (map.get(key) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
      .map(([tag, count]) => ({ tag, count }));
  }, [items]);

  // ✅ Filter list by active tag
  const filteredItems = useMemo(() => {
    if (!activeTag) return items;
    const k = activeTag.toLowerCase();
    return items.filter((s) =>
      (Array.isArray(s.tags) ? s.tags : []).some((t) => String(t).toLowerCase() === k)
    );
  }, [items, activeTag]);

  async function handleDelete(id: string) {
    try {
      setDeletingId(id);
      await apiFetch(`/api/saved-searches/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((x) => x.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  function openEdit(s: SavedSearch) {
    setEdit(s);
    setEditName(s.name || "");
    setEditTags(Array.isArray(s.tags) ? s.tags : []);
  }

  async function saveEdit() {
    if (!edit) return;
    try {
      setSaving(true);
      const res = await apiFetch(`/api/saved-searches/${edit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, tags: editTags }),
      });

      if (res?.data?.id) {
        setItems((prev) => prev.map((x) => (x.id === res.data.id ? res.data : x)));
      }
      setEdit(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">Saved Searches</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
              Save presets with names + tags, then open them anytime.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/myaccount"
              className="rounded-2xl border border-slate-200 dark:border-zinc-800 px-4 py-2 text-sm font-extrabold hover:bg-slate-50 dark:hover:bg-zinc-900"
            >
              Back
            </Link>
            <Link
              href="/listings"
              className="rounded-2xl border border-slate-200 dark:border-zinc-800 px-4 py-2 text-sm font-extrabold hover:bg-slate-50 dark:hover:bg-zinc-900"
            >
              Explore listings
            </Link>
            <button
              onClick={load}
              className="rounded-2xl bg-slate-900 text-white px-4 py-2 text-sm font-extrabold hover:bg-slate-800"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {!loading && !isBrand ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
          Saved searches are available for <b>Brands</b> only.
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          Loading saved searches...
        </div>
      ) : null}

      {/* ✅ Gmail-like tag filter chips */}
      {!loading && isBrand ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTag("")}
              className={`rounded-full px-4 py-2 text-sm font-extrabold border ${
                !activeTag
                  ? "bg-slate-900 text-white border-slate-900"
                  : "border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900"
              }`}
            >
              All ({items.length})
            </button>

            {tagCounts.length ? (
              tagCounts.map(({ tag, count }) => {
                const active = activeTag.toLowerCase() === tag.toLowerCase();
                return (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(tag)}
                    className={`rounded-full px-4 py-2 text-sm font-extrabold border ${
                      active
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900"
                    }`}
                    title={`Filter by #${tag}`}
                  >
                    #{tag} <span className="opacity-70">({count})</span>
                  </button>
                );
              })
            ) : (
              <div className="text-sm text-slate-500 dark:text-zinc-400">
                No tags yet. Add tags while saving a search.
              </div>
            )}
          </div>

          {activeTag ? (
            <div className="mt-3 text-sm text-slate-600 dark:text-zinc-400">
              Showing searches tagged with <b>#{activeTag}</b>
              <button
                onClick={() => setActiveTag("")}
                className="ml-2 text-emerald-700 dark:text-emerald-400 font-extrabold hover:underline"
              >
                Clear
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {!loading && isBrand ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          {filteredItems.length ? (
            <div className="space-y-4">
              {filteredItems.map((s) => (
                <div key={s.id} className="rounded-2xl border border-slate-200 dark:border-zinc-800 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-lg font-extrabold truncate">{s.name || "Untitled search"}</div>
                      <div className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
                        Type: <b>{s.type}</b>
                      </div>

                      {/* ✅ show saved tags on each item */}
                      {Array.isArray(s.tags) && s.tags.length ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {s.tags.map((t) => (
                            <button
                              key={t}
                              onClick={() => setActiveTag(t)}
                              className="rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-1 text-xs font-extrabold hover:bg-slate-50 dark:hover:bg-zinc-900"
                              title="Filter by this tag"
                            >
                              #{t}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 text-[12px] text-slate-500 dark:text-zinc-400">No tags</div>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Link
                        href={
                          s.slug
                            ? `/influencers/${s.slug}`
                            : `/listings?${new URLSearchParams(s.params || {}).toString()}`
                        }
                        className="rounded-2xl bg-emerald-600 text-white px-4 py-2 text-sm font-extrabold hover:bg-emerald-700"
                      >
                        Open
                      </Link>

                      <button
                        onClick={() => openEdit(s)}
                        className="rounded-2xl border border-slate-200 dark:border-zinc-800 px-4 py-2 text-sm font-extrabold hover:bg-slate-50 dark:hover:bg-zinc-900"
                      >
                        Rename / Tags
                      </button>

                      <button
                        disabled={deletingId === s.id}
                        onClick={() => handleDelete(s.id)}
                        className="rounded-2xl border border-red-200 dark:border-red-900/40 px-4 py-2 text-sm font-extrabold text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-50"
                      >
                        {deletingId === s.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-600 dark:text-zinc-400">
              No saved searches{" "}
              {activeTag ? (
                <>
                  for tag <b>#{activeTag}</b>.{" "}
                  <button
                    onClick={() => setActiveTag("")}
                    className="font-extrabold text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    Show all
                  </button>
                </>
              ) : (
                <>
                  yet. Go to{" "}
                  <Link className="font-extrabold text-emerald-700 dark:text-emerald-400" href="/listings">
                    Listings
                  </Link>{" "}
                  and click <b>Save search</b>.
                </>
              )}
            </div>
          )}
        </div>
      ) : null}

      {/* Edit Modal */}
      {edit ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEdit(null)} />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shadow-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-extrabold">Edit saved search</div>
                <div className="text-sm text-slate-600 dark:text-zinc-300">
                  Rename it and add tags to organize presets.
                </div>
              </div>
              <button
                onClick={() => setEdit(null)}
                className="h-10 w-10 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-900"
              >
                ✕
              </button>
            </div>

            <div className="mt-4">
              <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Name</div>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-sm outline-none"
              />
            </div>

            <div className="mt-4">
              <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Tags</div>
              <TagsEditor tags={editTags} onChange={setEditTags} />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setEdit(null)}
                className="rounded-2xl border border-slate-200 dark:border-zinc-800 px-4 py-2 text-sm font-extrabold hover:bg-slate-50 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                onClick={saveEdit}
                className="rounded-2xl bg-slate-900 text-white px-4 py-2 text-sm font-extrabold hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
