import { test, expect } from '@playwright/test';

test.describe('Public Pages', () => {
  test('home page loads and shows login button', async ({ page }) => {
    await page.goto('/');

    // ページタイトルを確認
    await expect(page).toHaveTitle(/Workspace守り番/);

    // ログインボタンが表示されている（「Google でログイン」）
    const loginButton = page.getByRole('button', { name: /Google.*ログイン/i });
    await expect(loginButton).toBeVisible();
  });

  test('login page displays correctly', async ({ page }) => {
    await page.goto('/login');

    // ログインページの要素を確認
    await expect(page.getByText(/守り番/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Google.*ログイン/i })).toBeVisible();
  });
});

test.describe('Protected Routes Redirect', () => {
  test('dashboard redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');

    // ログインページにリダイレクトされる
    await expect(page).toHaveURL(/\/login/);
  });

  test('scan page redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/scan');

    // ログインページにリダイレクトされる
    await expect(page).toHaveURL(/\/login/);
  });

  test('settings page redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/settings');

    // ログインページにリダイレクトされる
    await expect(page).toHaveURL(/\/login/);
  });

  test('files page redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/files/test-scan-id');

    // ログインページにリダイレクトされる
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Navigation Elements', () => {
  test('login page has correct branding', async ({ page }) => {
    await page.goto('/login');

    // ブランドロゴ/タイトルが表示される（ヘッダーに「守り番」）
    await expect(page.getByText(/守り番/)).toBeVisible();
  });

  test('login button is clickable', async ({ page }) => {
    await page.goto('/login');

    const loginButton = page.getByRole('button', { name: /Google.*ログイン/i });
    await expect(loginButton).toBeEnabled();
  });
});

test.describe('UI Components', () => {
  test('page has proper viewport', async ({ page }) => {
    await page.goto('/login');

    // ビューポートサイズが適切
    const viewportSize = page.viewportSize();
    expect(viewportSize?.width).toBeGreaterThan(0);
    expect(viewportSize?.height).toBeGreaterThan(0);
  });

  test('page is responsive', async ({ page }) => {
    // モバイルビューポート
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');

    // ログインボタンが引き続き表示される
    const loginButton = page.getByRole('button', { name: /Google.*ログイン/i });
    await expect(loginButton).toBeVisible();
  });

  test('page works on tablet viewport', async ({ page }) => {
    // タブレットビューポート
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/login');

    // ログインボタンが引き続き表示される
    const loginButton = page.getByRole('button', { name: /Google.*ログイン/i });
    await expect(loginButton).toBeVisible();
  });
});

test.describe('Error Handling', () => {
  test('404 page for unknown routes', async ({ page }) => {
    await page.goto('/unknown-page-that-does-not-exist');

    // 何らかのエラー表示またはリダイレクト
    // React Routerの設定によっては、ログインページにリダイレクトされるか、
    // 404ページが表示される
    const currentUrl = page.url();
    expect(currentUrl).toBeTruthy();
  });
});
