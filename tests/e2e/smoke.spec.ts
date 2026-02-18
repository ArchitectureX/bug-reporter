import { expect, test } from "@playwright/test";

test("opens launcher and submits report", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Open bug reporter" }).click();
  await page.getByLabel("Title").fill("Checkout button does not respond");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Submit report" }).click();

  await expect(page.getByText("Thanks, report submitted")).toBeVisible();
});
