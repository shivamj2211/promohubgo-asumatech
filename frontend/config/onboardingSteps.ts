// frontend/config/onboardingSteps.ts

export type Role = "INFLUENCER" | "BRAND";

export interface OnboardingStep {
  step: number;              // stable step number (DB ke saath sync)
  id: string;                // internal id (future-proof)
  title: string;             // main heading
  subtitle: string;          // short explanation
  route: string;             // exact route (NO mismatch)
}

/* ---------------- INFLUENCER ---------------- */

export const INFLUENCER_STEPS: OnboardingStep[] = [
  {
    step: 1,
    id: "profile",
    title: "Create your profile",
    subtitle: "Tell brands who you are",
    route: "/influencer/profile",
  },
  {
    step: 2,
    id: "location",
    title: "Your location",
    subtitle: "Helps brands find you locally",
    route: "/influencer/location",
  },
  {
    step: 3,
    id: "categories",
    title: "Content categories",
    subtitle: "Choose what best represents you",
    route: "/influencer/categories",
  },
  {
    step: 4,
    id: "socials",
    title: "Social presence",
    subtitle: "Add your social media accounts",
    route: "/influencer/socials",
  },
  {
    step: 5,
    id: "media",
    title: "Images & cover",
    subtitle: "Show your best work",
    route: "/influencer/images",
  },
  {
    step: 6,
    id: "review",
    title: "Review & finish",
    subtitle: "Confirm and go live",
    route: "/influencer/review",
  },
];

/* ---------------- BRAND ---------------- */

export const BRAND_STEPS: OnboardingStep[] = [
  {
    step: 1,
    id: "profile",
    title: "Brand profile",
    subtitle: "Tell influencers about your brand",
    route: "/brand/profile",
  },
  {
    step: 2,
    id: "budget",
    title: "Budget range",
    subtitle: "Set your expected spend",
    route: "/brand/budget",
  },
  {
    step: 3,
    id: "businessType",
    title: "Business type",
    subtitle: "What best describes your business",
    route: "/brand/businesstype",
  },
  {
    step: 4,
    id: "categories",
    title: "Target influencers",
    subtitle: "Choose influencer categories",
    route: "/brand/categories",
  },
  {
    step: 5,
    id: "platforms",
    title: "Target platforms",
    subtitle: "Where should promotions run",
    route: "/brand/platforms",
  },
  {
    step: 6,
    id: "media",
    title: "Brand visuals",
    subtitle: "Optional brand images",
    route: "/brand/images",
  },
];
