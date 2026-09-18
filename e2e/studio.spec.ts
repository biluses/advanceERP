import { expect, test, type Page } from "@playwright/test";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

const email = `ada-${Date.now()}@example.com`;
const password = "correct-horse-battery";

async function register(page: Page) {
  await page.goto("/register");
  await page.getByLabel("Your name").fill("Ada");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/app$/);
}

/** Signs the shared account in, creating it when a test runs on its own. */
async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForTimeout(500);
  if (!/\/app$/.test(page.url())) await register(page);
  await expect(page).toHaveURL(/\/app$/);
}

async function ensureProduct(page: Page) {
  await page.goto("/app/products");
  if (await page.getByRole("link", { name: /Aurora ceramic mug/ }).count()) return;
  await page.goto("/app/products/new");
  await page.getByLabel("Name").fill("Aurora ceramic mug");
  await page.getByRole("button", { name: "Create product" }).click();
  await expect(page).toHaveURL(/\/app\/products\/[0-9a-f-]+$/);
}

test.describe.configure({ mode: "serial" });

test("sign up lands in the studio with trial credits", async ({ page }) => {
  await register(page);
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { name: /product images land here/i })).toBeVisible();
  await expect(page.locator(".vt-credits-n")).toHaveText("30");
});

test("a product with a photo, a brand kit, and a generated pack shot", async ({ page }) => {
  await signIn(page);

  /* Brand kit. */
  await page.goto("/app/brand");
  await page.getByLabel("Brand name").fill("Aurora Home");
  await page.getByLabel("Visual style").fill("minimal scandinavian, soft daylight");
  await page.getByLabel("Never show").fill("text, clutter");
  await page.getByRole("button", { name: "Save brand kit" }).click();
  await expect(page.getByText("Saved")).toBeVisible();

  /* Product. */
  await page.goto("/app/products/new");
  await page.getByLabel("Name").fill("Aurora ceramic mug");
  await page.getByLabel("Category").selectOption("Home & furniture");
  await page.getByLabel("How it looks").fill("matte sage green glaze, speckled");
  await page.getByRole("button", { name: "Create product" }).click();
  await expect(page).toHaveURL(/\/app\/products\/[0-9a-f-]+$/);
  await page.locator('.vt-photo--add input[type="file"]').setInputFiles({ name: "mug.png", mimeType: "image/png", buffer: PNG });
  await expect(page.locator(".vt-photo img")).toHaveCount(1);
  await expect(page.locator(".vt-photo img")).toHaveAttribute("src", /\/api\/files\//);

  /* Studio: product + preset, then generate. */
  await page.goto("/app");
  await page.getByRole("tab", { name: "Image" }).click();
  await page.getByRole("button", { name: "Change product" }).click();
  await page.getByRole("button", { name: /Aurora ceramic mug/ }).click();
  await page.getByRole("button", { name: "Change preset" }).click();
  await page.getByRole("button", { name: /^Pack shot/ }).click();
  await expect(page.locator(".vt-jobpill-value", { hasText: "Pack shot" })).toBeVisible();
  await expect(page.locator(".vt-strip-item")).toHaveCount(1);

  await page.getByRole("button", { name: "Show final prompt" }).click();
  await expect(page.locator(".vt-preview-text")).toContainText("Professional e-commerce product photograph of Aurora ceramic mug");
  await expect(page.locator(".vt-preview-text")).toContainText("Avoid: text, clutter.");

  await page.getByRole("textbox", { name: "Prompt" }).fill("front three-quarter view");
  await page.getByRole("button", { name: /^Generate/ }).click();
  await expect(page.locator(".vt-skeleton")).toHaveCount(1);
  await expect(page.locator(".vt-tile-media")).toHaveCount(1, { timeout: 30_000 });
  await expect(page.locator(".vt-tile-media")).toHaveAttribute("src", /localhost:4110\/media\//);
  /* Flux at 2k costs 2 credits. */
  await expect(page.locator(".vt-credits-n")).toHaveText("28");

  /* Approve from the viewer; the tile carries the mark. */
  await page.locator(".vt-tile-open").click();
  const viewer = page.locator(".vt-viewer");
  await viewer.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(viewer.getByRole("button", { name: "Approved", exact: true })).toBeVisible();
  await viewer.getByRole("button", { name: "Close" }).click();
  await expect(page.locator(".vt-tile-review[data-review='approved']")).toHaveCount(1);

  /* Survives a reload: the run log lives on the server. */
  await page.reload();
  await expect(page.locator(".vt-tile-media")).toHaveCount(1);
  await expect(page.locator(".vt-credits-n")).toHaveText("28");

  /* A failing run is refunded. */
  await page.getByRole("textbox", { name: "Prompt" }).fill("MOCK_FAIL this one");
  await page.getByRole("button", { name: /^Generate/ }).click();
  await expect(page.locator(".vt-tile--failed")).toHaveCount(1, { timeout: 30_000 });
  await expect(page.locator(".vt-credits-n")).toHaveText("28");
});

test("a campaign generates its plan and exports approved files", async ({ page }) => {
  await signIn(page);
  await ensureProduct(page);

  await page.goto("/app/campaigns/new");
  await page.getByLabel("Campaign name").fill("Spring launch");
  await page.getByRole("textbox", { name: /^Scene/ }).fill("a bright kitchen at breakfast");
  /* Defaults: pack shot + lifestyle, instagram feed + amazon → 4 runs. */
  await expect(page.locator(".vt-form-note")).toContainText("4 runs");
  await page.getByRole("button", { name: "Create campaign" }).click();
  await expect(page).toHaveURL(/\/app\/campaigns\/[0-9a-f-]+$/);
  await expect(page.locator(".vt-pair")).toHaveCount(4);

  await page.getByRole("button", { name: /^Generate 4 runs/ }).click();
  await expect(page.locator(".vt-result[data-status='completed']")).toHaveCount(4, { timeout: 45_000 });
  await expect(page.locator(".vt-channel-title", { hasText: "Amazon main image" })).toBeVisible();

  const approve = page.locator(".vt-result[data-status='completed']").first().getByRole("button", { name: "Approve", exact: true });
  await approve.click();
  await expect(page.getByRole("button", { name: /Export 1 approved/ })).toBeEnabled();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export 1 approved/ }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("spring-launch-export.zip");

  /* The settings page shows the ledger with the campaign's debits. */
  await page.goto("/app/settings");
  await expect(page.locator(".vt-table tbody tr").first()).toContainText("Generation");
});

test("signed-out visitors are sent to sign in from every app page", async ({ page }) => {
  for (const path of ["/app", "/app/products", "/app/campaigns/new", "/app/settings"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
});
