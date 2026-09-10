import type { ReactNode } from "react";
import { HatchEgg } from "@/components/brand/HatchEgg";
import { HatchMark } from "@/components/brand/HatchMark";
import { FoodDoodles } from "@/components/brand/FoodDoodles";

export function AuthShell({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <main className="relative min-h-dvh flex flex-col items-center justify-center px-5 py-12 overflow-hidden">
      <FoodDoodles
        spots={[
          { top: "6%", left: "8%", rotate: -12, size: 58 },
          { top: "14%", right: "10%", rotate: 14, size: 66 },
          { bottom: "12%", left: "6%", rotate: 8, size: 62 },
          { bottom: "8%", right: "9%", rotate: -16, size: 54 },
          { top: "44%", left: "3%", rotate: 20, size: 46 },
          { top: "40%", right: "4%", rotate: -8, size: 50 },
        ]}
      />

      <div className="relative w-full max-w-sm flex flex-col items-center">
        <HatchEgg size={128} className="animate-[bob_3s_ease-in-out_infinite]" />
        <HatchMark size="xl" className="mt-2" />
        <p className="mt-2 text-center text-muted text-sm max-w-[15rem]">
          The campus kitchen, in your pocket. Skip the queue, track the pan.
        </p>

        <div className="mt-7 w-full bg-surface border-2 border-line rounded-[22px] shadow-lg p-6">
          <h1 className="font-display font-semibold text-xl mb-4">{heading}</h1>
          {children}
        </div>
      </div>
    </main>
  );
}
