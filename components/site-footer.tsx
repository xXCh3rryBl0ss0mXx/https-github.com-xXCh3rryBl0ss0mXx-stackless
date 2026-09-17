import Link from "next/link";
import { PRIVACY_PATH, TERMS_PATH } from "@/lib/legal";

const linkClass =
  "font-semibold text-logo-accent no-underline hover:underline";

/** One-line public footer — landing typography, no extra chrome. */
export function SiteFooter() {
  return (
    <footer className="mt-8 pb-2 text-center text-[0.85rem] text-muted">
      <p>
        Stackless ·{" "}
        <Link className={linkClass} href={TERMS_PATH}>
          Terms
        </Link>
        {" · "}
        <Link className={linkClass} href={PRIVACY_PATH}>
          Privacy
        </Link>
      </p>
    </footer>
  );
}
