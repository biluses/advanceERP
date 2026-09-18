import { describe, expect, it } from "vitest";

import { MODELS, getModel } from "@/generation/catalog";
import { parseSettings } from "@/generation/catalog";

import { EMPTY_BRAND, type BrandKit, type ProductFields } from "../brand";
import { getChannel, resolveAspect, resolveDuration } from "../channels";
import { PRESETS, getPreset } from "../presets";
import { compilePrompt, pickModel, resolveSettings } from "../prompt";

const product: ProductFields = {
  name: "Aurora ceramic mug",
  category: "Home & furniture",
  description: "A hand-glazed stoneware mug.",
  features: ["350 ml", "dishwasher safe"],
  appearance: "matte sage green glaze, speckled, natural clay rim",
  audience: "",
  priceLabel: "€24",
};

const brand: BrandKit = {
  ...EMPTY_BRAND,
  name: "Aurora Home",
  style: "minimal scandinavian, soft daylight",
  palette: ["#9CAF88", "#F4F1EA"],
  audience: "design-conscious home cooks",
  avoid: "text, clutter, other brands",
};

describe("compilePrompt", () => {
  it("folds product, brand, scene and channel into the lifestyle template", () => {
    const text = compilePrompt(getPreset("lifestyle-scene").template, {
      product,
      brand,
      channel: getChannel("instagram_story"),
      scene: "a sunlit kitchen counter at breakfast",
    });
    expect(text).toContain("Aurora ceramic mug (home & furniture) in a sunlit kitchen counter at breakfast.");
    expect(text).toContain("Appearance: matte sage green glaze");
    expect(text).toContain("Visual style: minimal scandinavian");
    expect(text).toContain("Made to appeal to design-conscious home cooks.");
    expect(text).toContain("Vertical full-screen framing");
    expect(text).toContain("Avoid: text, clutter, other brands.");
    expect(text).not.toMatch(/\{\{/);
  });

  it("drops lines whose tokens are all empty and never leaves dangling connectors", () => {
    const text = compilePrompt(getPreset("lifestyle-scene").template, {
      product: { ...product, appearance: "", category: "Other" },
      brand: null,
      channel: null,
      scene: "",
    });
    expect(text.startsWith("Lifestyle product photograph of Aurora ceramic mug.")).toBe(true);
    expect(text).not.toContain("Appearance");
    expect(text).not.toContain("Avoid");
    expect(text).not.toMatch(/\sin\.$/m);
    expect(text).not.toContain("  ");
  });

  it("works with nothing but a scene", () => {
    const text = compilePrompt(getPreset("pack-shot").template, {
      product: null,
      brand: null,
      channel: null,
      scene: "",
    });
    expect(text).toContain("Seamless pure white studio background");
    expect(text).not.toContain("photograph of .");
  });
});

describe("resolveSettings", () => {
  it("applies the preset then the channel, only for keys the model declares", () => {
    const model = getModel("seedance-2.5");
    const settings = resolveSettings(model, getPreset("lifestyle-broll"), getChannel("tiktok"));
    expect(settings.aspectRatio).toBe("9:16");
    expect(settings.duration).toBe(10);
    expect(settings.resolution).toBeUndefined(); // 1080p is not a seedance-2.5 value
    expect(settings.generateAudio).toBe(true);
    expect(() => parseSettings(model, settings)).not.toThrow();
  });

  it("lets explicit overrides win over preset and channel", () => {
    const model = getModel("kling-3-std");
    const settings = resolveSettings(model, getPreset("product-spin"), getChannel("youtube_ad"), {
      duration: 7,
      aspectRatio: "1:1",
    });
    expect(settings.duration).toBe(7);
    expect(settings.aspectRatio).toBe("1:1");
    expect(settings.sound).toBe(false);
  });

  it("falls back to the closest ratio the model can make", () => {
    const flux = getModel("flux-2");
    expect(resolveAspect(getChannel("pinterest"), flux)).toBe("3:4");
    expect(resolveAspect(getChannel("instagram_feed"), flux)).toBe("1:1");
    expect(resolveDuration(getChannel("tiktok"), getModel("kling-3-turbo"))).toBe(10);
    expect(resolveDuration(getChannel("tiktok"), flux)).toBeNull();
  });
});

describe("presets", () => {
  it("every preset resolves to a real model of its surface and parses cleanly", () => {
    for (const preset of PRESETS) {
      const model = pickModel(preset, MODELS);
      expect(model.surface).toBe(preset.surface);
      for (const channelId of preset.channels) {
        const channel = getChannel(channelId);
        expect(channel.surfaces).toContain(preset.surface);
        const settings = resolveSettings(model, preset, channel);
        expect(() => parseSettings(model, settings)).not.toThrow();
      }
      if (preset.productRole) expect(model.roles[preset.productRole]).toBeGreaterThan(0);
    }
  });

  it("prefers the first catalog model in the list", () => {
    expect(pickModel(getPreset("pack-shot"), MODELS).id).toBe("flux-2");
    const noFlux = MODELS.filter((entry) => entry.id !== "flux-2");
    expect(pickModel(getPreset("pack-shot"), noFlux).id).toBe("qwen-image-3");
  });
});
