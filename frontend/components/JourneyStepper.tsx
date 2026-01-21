'use client';

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getOnboardingFlow, Role } from "@/config/onboardingFlow";

interface Props {
  role?: Role;
  currentStep?: number;
}

export default function JourneyStepper({ role: roleProp, currentStep: stepProp }: Props) {
  const pathname = usePathname();
  const [role, setRole] = useState<Role | null>(roleProp || null);
  const [currentStep, setCurrentStep] = useState<number | null>(
    Number.isInteger(stepProp) ? stepProp! : null
  );

  useEffect(() => {
    if (role && currentStep !== null) return;
    let active = true;
    (async () => {
      try {
        const res = await apiFetch("/api/me");
        if (!active) return;
        const user = res?.user || {};
        if (!role) setRole(user.role || null);
        if (currentStep === null && Number.isInteger(user.onboardingStep)) {
          setCurrentStep(user.onboardingStep);
        }
      } catch {
        if (active && !role) setRole("INFLUENCER");
      }
    })();
    return () => {
      active = false;
    };
  }, [role, currentStep]);

  const steps = useMemo(() => getOnboardingFlow(role), [role]);
  const activeStep = useMemo(() => {
    const found = steps.find((s) => s.route === pathname);
    return found?.step || currentStep || steps[0]?.step || 1;
  }, [steps, pathname, currentStep]);

  return (
    <div className="w-full mb-6">
      <div className="flex items-start justify-between gap-3 overflow-x-auto pb-1">
        {steps.map((s, idx) => {
          const isCompleted = s.step < activeStep;
          const isActive = s.step === activeStep;
          const isLast = idx === steps.length - 1;

          return (
            <div key={s.id} className="flex-1 min-w-[140px]">
              <div className="flex items-center gap-2">
                <div
                  className={[
                    "h-8 w-8 flex items-center justify-center rounded-full text-sm font-bold",
                    isCompleted
                      ? "bg-emerald-600 text-white"
                      : isActive
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-300 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300",
                  ].join(" ")}
                >
                  {isCompleted ? "✓" : s.step}
                </div>

                {!isLast && (
                  <div
                    className={[
                      "flex-1 h-[2px]",
                      isCompleted ? "bg-emerald-600" : "bg-gray-300 dark:bg-zinc-700",
                    ].join(" ")}
                  />
                )}
              </div>

              <div className="mt-2">
                <p
                  className={[
                    "text-sm font-semibold",
                    isActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-700 dark:text-zinc-300",
                  ].join(" ")}
                >
                  {s.title}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
