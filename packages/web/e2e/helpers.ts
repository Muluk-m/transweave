import { Page, expect } from '@playwright/test';

/**
 * Login with demo account via UI form.
 */
export async function loginAsDemo(page: Page) {
  await page.goto('/login');

  // Wait for either the demo button or the email input to appear
  await page.waitForSelector('button, input[type="text"], input[type="email"]', { timeout: 15_000 });

  // Click "试用 Demo 账号" button which logs in as admin@test.com/admin123456
  const demoButton = page.getByRole('button', { name: /Demo|demo/ });
  if (await demoButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await demoButton.click();
  } else {
    // Fallback: fill form manually
    await page.locator('input').first().fill('admin@test.com');
    await page.locator('input').nth(1).fill('admin123456');
    await page.getByRole('button', { name: /登录|Login/i }).click();
  }

  // Wait for navigation away from login page
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to the first project's settings > languages tab.
 */
export async function goToLanguageSettings(page: Page) {
  // Use the sidebar link to navigate to a project (sidebar shows project names)
  const sidebarProjectLink = page.locator('nav a[href*="/project/"], aside a[href*="/project/"]').first();

  if (await sidebarProjectLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await sidebarProjectLink.click();
  } else {
    // Fallback: look for any project link on the page (could be text link or button)
    const projectLink = page.locator('[href*="/project/"]').first();
    await projectLink.waitFor({ timeout: 10_000 });
    await projectLink.click();
  }

  await page.waitForLoadState('networkidle');

  // Click the settings tab
  const settingsTab = page.getByRole('tab', { name: /设置|Settings/i });
  await settingsTab.waitFor({ timeout: 10_000 });
  await settingsTab.click();

  // Click the languages sub-tab
  const languagesTab = page.getByRole('tab', { name: /语种管理|Languages/i });
  await languagesTab.waitFor({ timeout: 5_000 });
  await languagesTab.click();
  await page.waitForTimeout(500);
}
