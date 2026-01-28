"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { TopNav } from "@/components/top-nav";
import { SiteFooter } from "@/components/footer/site-footer";

type Proposal = {
  id: string;
  status: string;
  price: number;
  message: string;
  createdAt: string;
  brandId: string;
  creatorId: string;
  package?: { id: string; title: string; platform: string } | null;
  brand?: { id: string; name?: string | null; username?: string | null } | null;
  creator?: { id: string; name?: string | null; username?: string | null } | null;
};

type Message = {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
};

export default function ProposalDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [me, setMe] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");

  const load = async () => {
    const res = await apiFetch(`/api/proposals/${params.id}`);
    setProposal(res?.data || null);
    const msg = await apiFetch(`/api/proposals/${params.id}/messages`);
    setMessages(Array.isArray(msg?.items) ? msg.items : []);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const meRes = await apiFetch("/api/me");
        if (!active) return;
        if (meRes?.ok && meRes?.user?.id) setMe({ id: meRes.user.id });
        await load();
      } catch {
        if (active) {
          setProposal(null);
          setMessages([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [params.id]);

  const updateStatus = async (status: "ACCEPTED" | "REJECTED") => {
    await apiFetch(`/api/proposals/${params.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await load();
  };

  const sendMessage = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await apiFetch(`/api/proposals/${params.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: text }),
      });
      setText("");
      await load();
    } finally {
      setSending(false);
    }
  };

  const convertToOrder = async () => {
    const res = await apiFetch(`/api/proposals/${params.id}/convert`, { method: "POST" });
    if (res?.order?.id) {
      router.push(`/checkout/${res.order.id}`);
    }
  };

  if (loading) return <div className="p-10">Loading...</div>;
  if (!proposal) return <div className="p-10">Proposal not found</div>;

  const isCreator = me?.id === proposal.creatorId;
  const isBrand = me?.id === proposal.brandId;
  const canChat = proposal.status === "ACCEPTED";

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100">
      <TopNav />
      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold">Proposal</h1>
          <button onClick={() => router.back()} className="text-sm underline">
            Back
          </button>
        </div>

      <div className="rounded-2xl border border-slate-200 p-4 space-y-2">
        <div className="font-semibold">
          {proposal.brand?.name || proposal.brand?.username || "Brand"} →{" "}
          {proposal.creator?.name || proposal.creator?.username || "Creator"}
        </div>
        <div className="text-sm text-slate-600">
          {proposal.package?.title || "Custom package"} · ${proposal.price}
        </div>
        <div className="text-xs text-slate-500">Status: {proposal.status}</div>
        <p className="text-sm">{proposal.message}</p>
      </div>

      {proposal.status === "PENDING" && isCreator ? (
        <div className="flex gap-2">
          <button
            onClick={() => updateStatus("ACCEPTED")}
            className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-semibold"
          >
            Accept
          </button>
          <button
            onClick={() => updateStatus("REJECTED")}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold"
          >
            Reject
          </button>
        </div>
      ) : null}

      {proposal.status === "ACCEPTED" && isBrand ? (
        <button
          onClick={convertToOrder}
          className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold"
        >
          Convert to Order
        </button>
      ) : null}

      <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="font-semibold">Messages</div>
        {messages.length === 0 ? (
          <div className="text-sm text-slate-500">No messages yet.</div>
        ) : (
          <div className="space-y-2">
            {messages.map((m) => (
              <div key={m.id} className="text-sm">
                <span className="font-semibold">
                  {m.senderId === proposal.brandId ? "Brand" : "Creator"}:
                </span>{" "}
                {m.content}
              </div>
            ))}
          </div>
        )}

        {canChat ? (
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Type a message"
            />
            <button
              disabled={sending}
              onClick={sendMessage}
              className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              Send
            </button>
          </div>
        ) : (
          <div className="text-xs text-slate-500">Chat unlocks after acceptance.</div>
        )}
      </div>
      </main>
      <SiteFooter />
    </div>
  );
}
