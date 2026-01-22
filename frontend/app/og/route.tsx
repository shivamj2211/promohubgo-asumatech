import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") || "PromoHubGo";
  const subtitle = searchParams.get("subtitle") || "Influencer Marketplace";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 64,
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)",
          color: "white",
          fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto",
        }}
      >
        <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.1 }}>{title}</div>
        <div style={{ marginTop: 18, fontSize: 26, opacity: 0.9 }}>{subtitle}</div>
        <div style={{ marginTop: 34, display: "flex", gap: 12, alignItems: "center" }}>
          <div
            style={{
              height: 10,
              width: 10,
              borderRadius: 999,
              background: "#34d399",
            }}
          />
          <div style={{ fontSize: 20, opacity: 0.9 }}>promohubgo</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
