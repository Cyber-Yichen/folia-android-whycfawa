import { test, expect } from './fixtures';

// test/component/androidAdaptation.spec.ts

for (const viewport of [{ width: 740, height: 360 }, { width: 844, height: 390 }, { width: 390, height: 844 }, { width: 1200, height: 800 }]) {
    test('style controls remain reachable at ' + viewport.width + 'x' + viewport.height, async ({ page, mount }) => {
        await page.setViewportSize(viewport);
        await mount('androidAdaptation');
        const gallery = page.locator('[data-visualizer-style]');
        await expect(gallery).toHaveCount(15);
        await expect(gallery.locator('img')).toHaveCount(14);
        await page.locator('[data-visualizer-style="sonnet"]').click();
        await expect(page.locator('[data-visualizer-style="sonnet"]')).toHaveAttribute('aria-pressed', 'true');
        const controls = page.getByTestId('visualizer-settings-scroll');
        await expect(controls.locator('input[type=range]').first()).toBeAttached({ timeout: 45000 });
        await expect.poll(() => controls.evaluate(el => el.scrollHeight - el.clientHeight)).toBeGreaterThan(0);
        await controls.evaluate(el => el.scrollTo({ top: el.scrollHeight }));
        await expect.poll(() => controls.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
        const last = controls.locator('input[type="range"]').last();
        await last.scrollIntoViewIfNeeded();
        await expect(last).toBeInViewport();
        await last.focus();
        const before = await last.inputValue();
        await last.press('Home');
        await last.press('ArrowRight');
        expect(await last.inputValue()).not.toBe(before);
        await page.getByRole('button', { name: 'Default', exact: true }).click();
        await expect(last).toHaveValue(before);
        await expect(page.getByRole('button', { name: 'Fonts', exact: true })).toBeInViewport();
        await page.getByRole('button', { name: 'Fonts', exact: true }).click();
        await expect(page.getByTestId('visualizer-settings-scroll')).toHaveJSProperty('scrollTop', 0);
        await expect(page.getByTestId('visualizer-settings-scroll').locator('input[type=\"range\"]').first()).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.setViewportSize(viewport.width < viewport.height ? { width: 844, height: 390 } : { width: 390, height: 844 });
        await expect(page.getByTestId('visualizer-settings-scroll')).toBeInViewport();
    });
}

test('landscape touch scroll reaches lower controls', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 740, height: 360 }, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
    const page = await context.newPage();
    await page.goto('/dev-probe.html?probe=androidAdaptation');
    await page.locator('[data-visualizer-style="sonnet"]').click();
    const controls = page.getByTestId('visualizer-settings-scroll');
    await expect.poll(() => controls.evaluate(el => el.scrollHeight - el.clientHeight)).toBeGreaterThan(0);
    const box = (await controls.boundingBox())!;
    const session = await context.newCDPSession(page);
    // Start in the card's padding: dragging a range input changes its value instead of scrolling.
    const x = box.x + 8;
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: box.y + box.height - 15 }] });
    for (let i = 1; i <= 8; i++) {
        await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: box.y + box.height - 15 - i * (box.height - 30) / 8 }] });
        await page.waitForTimeout(16);
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => controls.evaluate(el => el.scrollTop)).toBeGreaterThan(20);
    await context.close();
});

test('login tile follows real phases and respects reduced motion', async ({ page, mount }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mount('androidAdaptation');
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    const tile = page.locator('.login-qr-stage');
    await expect(tile).toHaveAttribute('data-login-phase', 'waiting');
    await expect(tile.locator('.login-qr-code')).toHaveCSS('animation-name', 'none');
    await page.getByRole('button', { name: 'Scan', exact: true }).click();
    await expect(tile).toHaveAttribute('data-login-phase', 'scanned');
    await expect(tile.locator('.login-qr-result')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(tile).toHaveAttribute('data-login-phase', 'confirmed');
    await expect(tile.locator('.login-qr-result')).toBeVisible();
});

test('Android settings hide keyboard and window controls while retaining swipe actions', async ({ page, mount }) => {
    await page.addInitScript(() => { Object.assign(window, { Capacitor: { getPlatform: () => 'android' } }); });
    await mount('androidSettings');
    await expect(page.locator('[data-settings-anchor="gridActionButton"]')).toBeVisible();
    await expect(page.locator('[data-settings-anchor="gridPaletteHotkey"]')).toHaveCount(0);
    await expect(page.locator('[data-settings-anchor="customShortcut"]')).toHaveCount(0);
    await expect(page.getByText('Always show window control buttons', { exact: true })).toHaveCount(0);
    await expect(page.getByText(/Ctrl\+K/)).toHaveCount(0);
});
