export type Role = "INFLUENCER" | "BRAND";

export type OnboardingStep = {
  step: number;
  id: string;
  title: string;
  route: string;
};

export const INFLUENCER_FLOW: OnboardingStep[] = [
  { step: 1, id: "profile", title: "Profile", route: "/profile" },
  { step: 2, id: "location", title: "Location", route: "/location" },
  { step: 3, id: "social", title: "Social media", route: "/social-media" },
  { step: 4, id: "description", title: "Description", route: "/description" },
  { step: 5, id: "summary", title: "Summary", route: "/summary" },
  { step: 6, id: "coverImages", title: "Cover images", route: "/cover-images" },
  { step: 7, id: "portfolio", title: "Portfolio", route: "/portfolio" },
  { step: 8, id: "packages", title: "Packages", route: "/creator/packages" },
  { step: 9, id: "boosters", title: "Boosters", route: "/boosters" },
];

export const BRAND_FLOW: OnboardingStep[] = [
  { step: 1, id: "profile", title: "Profile", route: "/profile" },
  { step: 2, id: "location", title: "Location", route: "/location" },
  { step: 3, id: "hereToDo", title: "Here to do", route: "/brand/heretodo" },
  { step: 4, id: "budget", title: "Budget", route: "/brand/approximatebudget" },
  { step: 5, id: "businessType", title: "Business type", route: "/brand/businesstype" },
  { step: 6, id: "selectInfluencer", title: "Select influencer", route: "/brand/selectinfluencer" },
  { step: 7, id: "platforms", title: "Target platforms", route: "/brand/targetplatforms" },
  { step: 8, id: "summary", title: "Summary", route: "/summary" },
];

export function getOnboardingFlow(role: Role | null | undefined) {
  return role === "BRAND" ? BRAND_FLOW : INFLUENCER_FLOW;
}

export function getRouteForStep(role: Role | null | undefined, step: number | null | undefined) {
  const flow = getOnboardingFlow(role);
  const found = flow.find((s) => s.step === step);
  return found?.route || flow[0]?.route || "/";
}
