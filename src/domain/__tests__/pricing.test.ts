import { describe, expect, it } from "vitest";

import { getModel } from "@/generation/catalog";

import { exportPath } from "../export";
import { PLANS, formatPrice, getPlan } from "../plans";
import { creditsFor } from "../pricing";

describe("creditsFor", () => {
  it("prices images by resolution and count", () => {
    const flux = getModel("flux-2");
    expect(creditsFor(flux, { resolution: "1k" })).toBe(1);
    expect(creditsFor(flux, { resolution: "2k" })).toBe(2);
    expect(creditsFor(flux, { resolution: "4k" })).toBe(4);
    const soul = getModel("soul-2");
    expect(creditsFor(soul, { resolution: "720p", batchSize: "4" })).toBe(4);
    expect(creditsFor(getModel("soul-cinema"), { resolution: "1080p", batchSize: "1" })).toBe(3);
  });

  it("prices video per second, by resolution and tier, with a floor", () => {
    const seedance = getModel("seedance-2");
    expect(creditsFor(seedance, { duration: 5, resolution: "720p" })).toBe(5);
    expect(creditsFor(seedance, { duration: 10, resolution: "1080p" })).toBe(20);
    expect(creditsFor(getModel("seedance-2-fast"), { duration: 4, resolution: "480p" })).toBe(4);
    expect(creditsFor(getModel("kling-3-pro"), { duration: 10, resolution: "1080p" })).toBe(30);
    expect(creditsFor(getModel("kling-3-4k"), { duration: 5 })).toBe(10);
  });

  it("always returns a positive integer", () => {
    for (const id of ["flux-2", "seedance-2.5", "kling-3-turbo", "ltx-2.5-fast"]) {
      const credits = creditsFor(getModel(id), {});
      expect(Number.isInteger(credits)).toBe(true);
      expect(credits).toBeGreaterThan(0);
    }
  });
});

describe("plans", () => {
  it("has a free tier first and ascending prices", () => {
    expect(PLANS[0]!.id).toBe("free");
    for (let i = 1; i < PLANS.length; i++) {
      expect(PLANS[i]!.priceCents).toBeGreaterThan(PLANS[i - 1]!.priceCents);
    }
    expect(getPlan("nope").id).toBe("free");
    expect(formatPrice(2900)).toMatch(/29/);
  });
});

describe("exportPath", () => {
  it("files runs by brand, product and channel with a stable name", () => {
    const path = exportPath({
      brand: "Aurora Home",
      product: "Aurora Ceramic Mug — Sage",
      channelTag: "ig-story",
      presetId: "lifestyle-scene",
      url: "https://cdn.example/abc.jpg?x=1",
      kind: "image",
      index: 2,
    });
    expect(path).toBe("aurora-home/aurora-ceramic-mug-sage/ig-story/lifestyle-scene-03.jpg");
    expect(
      exportPath({ brand: "", product: "", channelTag: null, presetId: null, url: "https://x/y", kind: "video", index: 0 }),
    ).toBe("brand/product/studio/run-01.mp4");
  });
});
