import { test, expect } from './fixtures';

// Folding must preserve credentials, explicit configuration navigation and the save path for disabling sync.
test('AI starts folded, retains configuration and opens from its existing entry', async ({ page }) => {
    await page.goto('/dev-probe.html?probe=settingsFeatureFolding');
    const toggle = page.getByRole('button', { name: 'AI Theme', exact: true });
    const provider = page.getByRole('combobox', { name: 'AI provider', exact: true });
    await expect(provider).not.toBeVisible();
    await page.getByRole('button', { name: 'AI Theme', exact: true }).click();
    await expect(provider).toBeVisible();
    await page.locator('input[type=password]').first().fill('example-test-key');
    await page.getByRole('button', { name: 'AI Theme', exact: true }).click();
    await expect(provider).not.toBeVisible();
    await page.getByRole('button', { name: 'Open AI settings', exact: true }).click();
    await expect(provider).toBeVisible();
    await expect(page.locator('input[type=password]').first()).toHaveValue('example-test-key');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
});

test('sync configuration folds off and can save disabling without losing the server', async ({ page }) => {
    await page.goto('/dev-probe.html?probe=settingsFeatureFolding');
    const section = page.locator('[data-settings-anchor="r2Sync"]');
    const toggle = section.locator('button[aria-controls]');
    const url = section.locator('input[type=url]');
    const token = section.locator('input[type=password]');
    const save = section.getByRole('button', { name: 'Save', exact: true });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(url).toHaveCount(0);
    await expect(save).toHaveCount(0);
    await toggle.click();
    await url.fill('https://sync.example.test');
    await token.fill('test-sync-token');
    await save.click();
    await expect(save).toBeDisabled();
    await toggle.click();
    await expect(url).toHaveCount(0);
    await expect(save).toBeEnabled();
    await save.click();
    await expect(save).toHaveCount(0);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('folia_sync_config_v1')!)))
        .toMatchObject({ enabled: false, workerBaseUrl: 'https://sync.example.test', authToken: 'test-sync-token' });
    await toggle.click();
    await expect(url).toHaveValue('https://sync.example.test');
    await expect(token).toHaveValue('test-sync-token');
});
