import { Inter } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";

import "@/studio/studio.css";
import "@/ui/app.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-vt-inter", display: "swap" });

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className={`vt vt-auth ${inter.variable}`}>
      <Link href="/" className="vt-side-brand vt-auth-brand">
        <span className="vt-side-mark" aria-hidden />
        <span className="vt-side-name">Vitrina</span>
      </Link>
      <div className="vt-auth-panel">{children}</div>
    </div>
  );
}
