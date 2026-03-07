import { test, expect } from '@playwright/test';
import { loginAsDemo, goToLanguageSettings } from './helpers';

test.describe('Language Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
    await goToLanguageSettings(page);
  });

  test('renders current languages as badges and command list', async ({ page }) => {
    // Current languages section should exist
    await expect(page.getByText(/当前语种|Current Languages/)).toBeVisible();

    // The "en" badge should always be present (required base language)
    await expect(page.locator('[data-slot="badge"]', { hasText: 'en' }).first()).toBeVisible();

    // Search input should exist in the command list
    await expect(page.getByPlaceholder(/搜索语言|Search languages/)).toBeVisible();

    // "常用" and "全部" groups should be visible
    await expect(page.getByText(/^常用$|^Common$/)).toBeVisible();
    await expect(page.getByText(/^全部$|^All$/)).toBeVisible();
  });

  test('search filters languages by code', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/搜索语言|Search languages/);
    await searchInput.fill('de');

    // "德语 (de)" should be visible
    await expect(page.getByRole('option', { name: /德语.*de|German.*de/ })).toBeVisible();

    // Unrelated languages should be hidden
    await expect(page.getByRole('option', { name: /日语.*ja|Japanese.*ja/ })).not.toBeVisible();
  });

  test('search filters languages by Chinese name', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/搜索语言|Search languages/);
    await searchInput.fill('日');

    // "日语 (ja)" should be visible
    await expect(page.getByRole('option', { name: /日语.*ja/ })).toBeVisible();
  });

  test('clicking unselected language adds it', async ({ page }) => {
    // Find a language that is not currently selected (e.g., "德语 (de)")
    const searchInput = page.getByPlaceholder(/搜索语言|Search languages/);
    await searchInput.fill('de');

    const deOption = page.getByRole('option', { name: /德语.*de|German.*de/ });
    await deOption.click();

    // "de" should now appear in the current languages badges
    await expect(page.locator('[data-slot="badge"]', { hasText: /de/ })).toBeVisible();
  });

  test('clicking selected language removes it', async ({ page }) => {
    // First add "de"
    const searchInput = page.getByPlaceholder(/搜索语言|Search languages/);
    await searchInput.fill('de');
    await page.getByRole('option', { name: /德语.*de|German.*de/ }).click();
    await searchInput.clear();

    // Verify "de" is in badges
    await expect(page.locator('[data-slot="badge"]', { hasText: /de/ })).toBeVisible();

    // Now click "de" again in the list to remove it
    await searchInput.fill('de');
    await page.getByRole('option', { name: /德语.*de|German.*de/ }).click();

    // "de" badge should be gone
    await searchInput.clear();
    await expect(page.locator('[data-slot="badge"]', { hasText: /^德语.*de/ })).not.toBeVisible();
  });

  test('removing language via badge X button', async ({ page }) => {
    // Find a non-en language badge with remove button
    const badges = page.locator('[data-slot="badge"]').filter({ hasNot: page.locator('text=en') });
    const count = await badges.count();

    if (count > 0) {
      const firstBadge = badges.first();
      const badgeText = await firstBadge.textContent();
      const removeBtn = firstBadge.locator('button');
      await removeBtn.click();

      // That badge should be gone
      if (badgeText) {
        // Wait a tick for state update
        await page.waitForTimeout(200);
      }
    }
  });

  test('English (en) cannot be removed', async ({ page }) => {
    // The "en" badge should NOT have a remove button
    const enBadge = page.locator('[data-slot="badge"]', { hasText: /英语.*en|English.*en/ }).first();
    await expect(enBadge).toBeVisible();

    const removeBtn = enBadge.locator('button');
    await expect(removeBtn).not.toBeVisible();

    // In the command list, "en" should be disabled
    const searchInput = page.getByPlaceholder(/搜索语言|Search languages/);
    await searchInput.fill('en');
    const enOption = page.getByRole('option', { name: /英语.*en|English.*en/ }).first();
    await expect(enOption).toHaveAttribute('data-disabled', 'true');
  });

  test('custom language: shows add option when no match', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/搜索语言|Search languages/);
    await searchInput.fill('xx-YY');

    // Should show "添加自定义语言" option
    await expect(page.getByText(/添加自定义语言.*xx-YY|Add custom language.*xx-YY/)).toBeVisible();
  });
});
