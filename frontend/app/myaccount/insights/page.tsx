'use client';

import { useEffect, useState } from 'react';

export default function InsightsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [earnings, setEarnings] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/creator/analytics').then(r => r.json()),
      fetch('/api/creator/earnings').then(r => r.json()),
      fetch('/api/onboarding/status').then(r => r.json()),
    ]).then(([a, e, p]) => {
      setAnalytics(a);
      setEarnings(e);
      setProfile(p);
    });
  }, []);

  if (!analytics || !profile) {
    return <div className="p-8">Loading insights...</div>;
  }

  const views = analytics.views || 0;
  const clicks = analytics.clicks || 0;
  const saves = analytics.saves || 0;
  const orders = analytics.orders || 0;

  const ctr = views ? (clicks / views) * 100 : 0;
  const saveRate = clicks ? (saves / clicks) * 100 : 0;
  const conversion = clicks ? (orders / clicks) * 100 : 0;

  const visibilityScore = Math.min(100, views * 5);
  const engagementScore = Math.round((ctr + saveRate) / 2);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Insights</h1>
        <p className="text-sm text-muted-foreground">
          Understand your influence, performance, and growth potential.
        </p>
      </div>

      {/* Impact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <InsightCard title="Visibility Score" value={`${visibilityScore}/100`} desc="How often brands see you" />
        <InsightCard title="Engagement Quality" value={`${engagementScore}%`} desc="Interest after viewing" />
        <InsightCard title="Monetization Readiness" value={profile.percentage >= 80 ? 'High' : 'Low'} desc="Profile completeness" />
        <InsightCard title="Conversion Strength" value={`${conversion.toFixed(1)}%`} desc="Clicks → Orders" />
      </div>

      {/* Intelligence */}
      <Section title="Engagement Intelligence">
        <InsightRow
          label="Click-Through Health"
          value={`${ctr.toFixed(1)}%`}
          hint={ctr < 2 ? 'Improve package titles & thumbnails' : 'Healthy interest from brands'}
        />
        <InsightRow
          label="Save Intent"
          value={`${saveRate.toFixed(1)}%`}
          hint={saveRate < 10 ? 'Brands are unsure — add portfolio samples' : 'Strong brand intent'}
        />
        <InsightRow
          label="Order Conversion"
          value={`${conversion.toFixed(1)}%`}
          hint={conversion < 1 ? 'Pricing or description needs work' : 'Packages converting well'}
        />
      </Section>

      {/* Earnings Potential */}
      <Section title="Earnings Potential">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Metric label="Current Earnings" value={`₹${earnings?.net || 0}`} />
          <Metric label="Missed Opportunities" value={views > 0 && orders === 0 ? 'Yes' : 'Low'} />
          <Metric label="Estimated Potential" value={`₹${views * 50}`} />
        </div>
      </Section>

      {/* Recommendations */}
      <Section title="Recommended Actions">
        <ul className="list-disc ml-5 space-y-2 text-sm">
          {profile.percentage < 100 && (
            <li>Complete your profile to unlock higher brand trust.</li>
          )}
          {ctr < 2 && <li>Optimize package titles to increase clicks.</li>}
          {saveRate < 10 && <li>Add portfolio samples to improve save rate.</li>}
          {orders === 0 && views > 10 && <li>Adjust pricing to improve conversion.</li>}
        </ul>
      </Section>

      {/* Footer */}
      <div className="border-t pt-4 text-sm text-muted-foreground">
        Insights are available exclusively for Premium members and update automatically.
      </div>
    </div>
  );
}

function InsightCard({ title, value, desc }: any) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="text-xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div className="rounded-lg border p-4 space-y-4">
      <h2 className="font-medium">{title}</h2>
      {children}
    </div>
  );
}

function InsightRow({ label, value, hint }: any) {
  return (
    <div className="flex justify-between text-sm">
      <span>{label}</span>
      <span className="font-medium">{value} — <span className="text-muted-foreground">{hint}</span></span>
    </div>
  );
}

function Metric({ label, value }: any) {
  return (
    <div className="rounded border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
