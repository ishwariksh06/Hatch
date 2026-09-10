import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";

export default function Forbidden() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-4 text-center px-6">
      <div className="text-4xl">🔒</div>
      <h1 className="font-display text-2xl">Not your counter</h1>
      <p className="text-muted text-sm max-w-xs">
        This area is for a different role. Head back to your home screen.
      </p>
      <Link href="/" className={buttonClass("secondary", "md", "mt-2")}>
        Take me home
      </Link>
    </main>
  );
}
