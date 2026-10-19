import { test, expect } from './fixtures';

// test/component/androidSettings.spec.ts
// Landscape reachability and reversible preferences in a real browser with native capability detection.
test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        Object.defineProperty(window, 'Capacitor', { configurable: true, value: { getPlatform: () => 'android' } });
    });
});
test('Android preferences change live and survive reload', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 420 });
    await page.goto('/dev-probe.html?probe=androidPerformanceSettings');
    const mode = page.getByRole('button', { name: 'Android performance mode', exact: true });
    await expect(mode).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Command palette', exact: true })).toBeVisible();
    await mode.click();
    await expect(page.locator('html')).toHaveAttribute('data-folia-android-performance', 'false');
    const hide = page.getByRole('button', { name: 'Hide command button', exact: true });
    await hide.click();
    await expect(page.getByRole('button', { name: 'Command palette', exact: true })).toHaveCount(0);
    const limit = page.getByRole('combobox', { name: 'Cache size limit' });
    await limit.click();
    await page.getByRole('option', { name: '0.5 GB', exact: true }).click();
    await expect(limit).toContainText('0.5 GB');
    await expect(page.locator('nav button svg')).toHaveCount(5);
    const values = await page.evaluate(() => ({
        mode: localStorage.getItem('folia_android_performance_mode'),
        hidden: localStorage.getItem('hide_command_palette_button'),
        limit: localStorage.getItem('folia_media_cache_limit_gb'),
    }));
    expect(values).toEqual({ mode: 'false', hidden: 'true', limit: '0.5' });
    // Fixture seed resets on every navigation; retain just the preferences being verified.
    await page.addInitScript(values => {
        localStorage.setItem('folia_android_performance_mode', values.mode!);
        localStorage.setItem('hide_command_palette_button', values.hidden!);
        localStorage.setItem('folia_media_cache_limit_gb', values.limit!);
    }, values);
    await page.reload();
    await expect(mode).toHaveAttribute('aria-pressed', 'false');
    await expect(hide).toHaveAttribute('aria-pressed', 'true');
    await expect(limit).toContainText('0.5 GB');
    await mode.click();
    await hide.click();
    await expect(page.locator('html')).toHaveAttribute('data-folia-android-performance', 'true');
    await expect(page.getByRole('button', { name: 'Command palette', exact: true })).toBeVisible();
});
for (const viewport of [{ width: 900, height: 360 }, { width: 568, height: 320 }, { width: 390, height: 760 }]) {
    test('Theme editor scrolls and saves at ' + viewport.width + 'x' + viewport.height, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto('/dev-probe.html?probe=themePark');
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        const box = await dialog.boundingBox();
        expect(box!.y).toBeGreaterThanOrEqual(0);
        expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
        await page.getByRole('button', { name: 'Custom Theme', exact: true }).click();
        const controls = page.getByTestId('theme-park-controls');
        const tabs = controls.locator('.grid.grid-cols-4 > button');
        await expect(tabs).toHaveCount(4);
        for (let index = 0; index < 4; index++) {
            await tabs.nth(index).scrollIntoViewIfNeeded();
            await tabs.nth(index).click();
            await controls.evaluate(element => { element.scrollTop = element.scrollHeight; });
            expect(await controls.evaluate(element => element.clientHeight)).toBeGreaterThan(50);
        }
        await page.getByRole('button', { name: 'Save and Apply Custom Theme', exact: true }).click();
        await expect(page.locator('[data-probe-saved-target]')).toHaveAttribute('data-probe-saved-target', 'custom');
    });
}
