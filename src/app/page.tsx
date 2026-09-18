import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";

import { CHANNELS } from "@/domain/channels";
import { PLANS, formatPrice } from "@/domain/plans";
import { PRESETS } from "@/domain/presets";
import { MODELS } from "@/generation/catalog";
import { VERTICAL } from "@/domain";

import "@/studio/studio.css";
import "@/ui/app.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-vt-inter", display: "swap" });

export const metadata: Metadata = { alternates: { canonical: "/" } };

const STEPS = [
  { title: "Add a product", body: "Name, category, a few lines on how it looks, and the photos you already have." },
  { title: "Pick a preset and a channel", body: "Pack shot for Amazon, lifestyle for Instagram, a 9:16 reveal for TikTok — ratio and length resolve themselves." },
  { title: "Generate, review, export", body: "Approve the keepers, export a folder per channel, publish." },
];

export default function LandingPage() {
  const images = PRESETS.filter((preset) => preset.surface === "image").length;
  const videos = PRESETS.length - images;
  return (
    <div className={`vt vt-landing ${inter.variable}`}>
      <header className="vt-landing-head">
        <Link href="/" className="vt-side-brand">
          <span className="vt-side-mark" aria-hidden />
          <span className="vt-side-name">{VERTICAL.name}</span>
        </Link>
        <nav className="vt-landing-nav">
          <a href="#pricing">Pricing</a>
          <Link href="/login">Sign in</Link>
          <Link href="/register" className="vt-btn-solid">
            Start free
          </Link>
        </nav>
      </header>

      <section className="vt-hero">
        <p className="vt-hero-kicker">{VERTICAL.descriptor}</p>
        <h1 className="vt-hero-title">Product photos and clips for every channel, from the photo you already have.</h1>
        <p className="vt-hero-copy">
          Upload a product shot. Pick a preset — pack shot, lifestyle scene, on-model, product reveal, UGC-style clip — and the
          channel it is for. {VERTICAL.name} writes the prompt from your brand kit, picks the right model out of {MODELS.length},
          fixes the ratio and length the channel wants, and files every approved result by product and channel.
        </p>
        <div className="vt-hero-actions">
          <Link href="/register" className="vt-cta">
            Create your studio — 30 free credits
          </Link>
          <a href="#how" className="vt-btn-quiet">
            How it works
          </a>
        </div>
        <ul className="vt-hero-facts">
          <li>
            <strong>{images}</strong> image presets
          </li>
          <li>
            <strong>{videos}</strong> video presets
          </li>
          <li>
            <strong>{CHANNELS.length}</strong> channels
          </li>
          <li>
            <strong>{MODELS.length}</strong> models
          </li>
        </ul>
      </section>

      <section className="vt-landing-section" id="how">
        <h2 className="vt-landing-h2">Three steps, one folder per channel</h2>
        <ol className="vt-steps">
          {STEPS.map((step, index) => (
            <li key={step.title} className="vt-step">
              <span className="vt-step-n">{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="vt-landing-section">
        <h2 className="vt-landing-h2">Presets an e-commerce team asks for by name</h2>
        <ul className="vt-preset-grid">
          {PRESETS.map((preset) => (
            <li key={preset.id} className="vt-preset-card">
              <span className="vt-preset-kind">{preset.surface}</span>
              <h3>{preset.label}</h3>
              <p>{preset.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="vt-landing-section" id="pricing">
        <h2 className="vt-landing-h2">Pricing</h2>
        <p className="vt-landing-lead">
          One credit is one standard image. Video is priced per second. Bring your own platform key on Pro and Studio and pay
          the platform directly instead.
        </p>
        <ul className="vt-plans">
          {PLANS.map((plan) => (
            <li key={plan.id} className="vt-plan" data-featured={plan.id === "pro" || undefined}>
              <h3>{plan.label}</h3>
              <p className="vt-plan-price">
                {plan.priceCents === 0 ? "Free" : formatPrice(plan.priceCents)}
                {plan.priceCents > 0 && <span> / month</span>}
              </p>
              <p className="vt-plan-blurb">{plan.blurb}</p>
              <ul className="vt-plan-features">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <Link href="/register" className={plan.id === "pro" ? "vt-cta" : "vt-btn-solid"}>
                {plan.priceCents === 0 ? "Start free" : `Start with ${plan.label}`}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <footer className="vt-landing-foot">
        <span>{VERTICAL.name} — {VERTICAL.descriptor}</span>
        <span>Built on an open studio for image and video generation.</span>
      </footer>
    </div>
  );
}
