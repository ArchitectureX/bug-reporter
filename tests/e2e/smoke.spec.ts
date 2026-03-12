import { expect, test } from "@playwright/test";

test("opens launcher and submits report", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Open bug reporter" }).click();
  await page.getByLabel("Title").fill("Checkout button does not respond");
  await page.getByLabel("How is this affecting your campaign?").selectOption("campaign_already_live");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByText("Issue Submitted")).toBeVisible();
});
