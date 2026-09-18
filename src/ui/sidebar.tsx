"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { signOut } from "@/auth/client";
import { getPlan } from "@/domain/plans";
import { AssetsIcon, GemIcon, ImageIcon, SlidersIcon, TagIcon, VideoIcon } from "@/studio/icons";
import { useCredits } from "@/studio/stores/credits";

const NAV = [
  { href: "/app", label: "Studio", icon: ImageIcon, exact: true },
  { href: "/app/products", label: "Products", icon: TagIcon },
  { href: "/app/campaigns", label: "Campaigns", icon: VideoIcon },
  { href: "/app/brand", label: "Brand kit", icon: AssetsIcon },
  { href: "/app/settings", label: "Settings", icon: SlidersIcon },
] as const;

export function Sidebar({
  workspaceName,
  planId,
  credits,
  byok,
  userName,
}: {
  workspaceName: string;
  planId: string;
  credits: number;
  byok: boolean;
  userName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const plan = getPlan(planId);
  /* Live while the studio is running; the server's number otherwise. */
  const live = useCredits((state) => state.balance);
  const shown = live ?? credits;

  return (
    <nav className="vt-side" aria-label="Workspace">
      <Link href="/app" className="vt-side-brand">
        <span className="vt-side-mark" aria-hidden />
        <span className="vt-side-name">Vitrina</span>
      </Link>

      <ul className="vt-side-nav">
        {NAV.map((item) => {
          const active = "exact" in item ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link href={item.href} className="vt-side-link" aria-current={active ? "page" : undefined}>
                <Icon size={15} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="vt-side-foot">
        <div className="vt-side-ws">
          <span className="vt-side-ws-name">{workspaceName}</span>
          <span className="vt-side-ws-plan">
            {plan.label}
            {byok ? " · own key" : ""}
          </span>
        </div>
        {!byok && (
          <Link href="/app/settings" className="vt-side-credits" data-low={shown < 10 || undefined}>
            <GemIcon size={13} />
            <span>{shown.toLocaleString()} credits</span>
          </Link>
        )}
        <div className="vt-side-user">
          <span className="vt-side-user-name" title={userName}>
            {userName}
          </span>
          <button
            type="button"
            className="vt-side-signout"
            onClick={() => void signOut().then(() => router.push("/login"))}
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
