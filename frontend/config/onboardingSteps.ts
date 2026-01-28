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
    route: "/profile",
  },
  {
    step: 2,
    id: "location",
    title: "Your location",
    subtitle: "Helps brands find you locally",
    route: "/location",
  },
  {
    step: 3,
    id: "socials",
    title: "Social presence",
    subtitle: "Add your social media accounts",
    route: "/social-media",
  },
  {
    step: 4,
    id: "description",
    title: "Description",
    subtitle: "Describe your content and audience",
    route: "/description",
  },
  {
    step: 5,
    id: "summary",
    title: "Summary",
    subtitle: "Summarize your profile",
    route: "/summary",
  },
  {
    step: 6,
    id: "coverImages",
    title: "Cover images",
    subtitle: "Add cover images for your profile",
    route: "/cover-images",
  },
  {
    step: 7,
    id: "portfolio",
    title: "Portfolio",
    subtitle: "Showcase your best work",
    route: "/portfolio",
  },
  {
    step: 8,
    id: "packages",
    title: "Packages",
    subtitle: "Create your first package",
    route: "/creator/packages",
  },
  {
    step: 9,
    id: "boosters",
    title: "Boosters",
    subtitle: "Improve deal success and pricing",
    route: "/boosters",
  },
];

/* ---------------- BRAND ---------------- */

export const BRAND_STEPS: OnboardingStep[] = [
  {
    step: 1,
    id: "profile",
    title: "Profile",
    subtitle: "Tell influencers about your brand",
    route: "/profile",
  },
  {
    step: 2,
    id: "location",
    title: "Location",
    subtitle: "Set your business location",
    route: "/location",
  },
  {
    step: 3,
    id: "hereToDo",
    title: "Here to do",
    subtitle: "Tell us what you're here to do",
    route: "/brand/heretodo",
  },
  {
    step: 4,
    id: "budget",
    title: "Budget",
    subtitle: "Set your expected spend",
    route: "/brand/approximatebudget",
  },
  {
    step: 5,
    id: "businessType",
    title: "Business type",
    subtitle: "What best describes your business",
    route: "/brand/businesstype",
  },
  {
    step: 6,
    id: "selectInfluencer",
    title: "Select influencer",
    subtitle: "Tell us who you want to work with",
    route: "/brand/selectinfluencer",
  },
  {
    step: 7,
    id: "platforms",
    title: "Target platforms",
    subtitle: "Where should promotions run",
    route: "/brand/targetplatforms",
  },
  {
    step: 8,
    id: "summary",
    title: "Summary",
    subtitle: "Review your onboarding details",
    route: "/summary",
  },
];
