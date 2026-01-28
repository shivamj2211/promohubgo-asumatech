"use client";

import { useRouter, usePathname } from "next/navigation";

type Action = {
  id: string;
  label: string;
  type: "REDIRECT" | "REQUIRE_LOGIN";
  url?: string;
  redirectAfterLogin?: string;
};

export default function ChatbotActions({
  compact = false,
  actions: actionsProp,
}: {
  compact?: boolean;
  actions?: Action[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  // 🔥 CONTEXTUAL ACTIONS
  const getActionsForPage = (): Action[] => {
    if (pathname.startsWith("/checkout")) {
      return [
        {
          id: "onboarding",
          label: "⚠️ Complete onboarding",
          type: "REQUIRE_LOGIN",
          redirectAfterLogin: "/onboarding",
        },
        {
          id: "package",
          label: "📦 Create package",
          type: "REQUIRE_LOGIN",
          redirectAfterLogin: "/creator/packages",
        },
      ];
    }

    if (pathname.startsWith("/creator")) {
      return [
        {
          id: "packages",
          label: "📦 Manage packages",
          type: "REQUIRE_LOGIN",
          redirectAfterLogin: "/creator/packages",
        },
        {
          id: "earnings",
          label: "💰 View earnings",
          type: "REQUIRE_LOGIN",
          redirectAfterLogin: "/creator/earnings",
        },
      ];
    }

    if (pathname.startsWith("/brand")) {
      return [
        {
          id: "find",
          label: "🔍 Find influencers",
          type: "REDIRECT",
          url: "/influencers",
        },
        {
          id: "orders",
          label: "📦 View orders",
          type: "REQUIRE_LOGIN",
          redirectAfterLogin: "/brand/orders",
        },
      ];
    }

    // Default
    return [
      {
        id: "articles",
        label: "📄 Read articles",
        type: "REDIRECT",
        url: "/articles",
      },
      {
        id: "demo",
        label: "📅 Request demo",
        type: "REDIRECT",
        url: "/demo",
      },
    ];
  };

  const actions = actionsProp?.length ? actionsProp : getActionsForPage();

  const handleClick = async (action: Action) => {
    if (action.type === "REDIRECT" && action.url) {
      router.push(action.url);
      return;
    }

    if (action.type === "REQUIRE_LOGIN") {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/me`,
        { credentials: "include" }
      );

      if (res.ok) {
        router.push(action.redirectAfterLogin || "/");
      } else {
        router.push(
          `/login?next=${encodeURIComponent(
            action.redirectAfterLogin || "/"
          )}`
        );
      }
    }
  };

  return (
    <div className={compact ? "grid grid-cols-2 gap-2" : "space-y-3"}>
      {actions.map(action => (
        <button
          key={action.id}
          onClick={() => handleClick(action)}
          className="
            w-full rounded-xl border px-3 py-2 text-sm transition
            bg-white border-gray-200 hover:bg-gray-50
            dark:bg-[#151B2C] dark:border-gray-700 dark:hover:bg-[#1B2236]
          "
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
