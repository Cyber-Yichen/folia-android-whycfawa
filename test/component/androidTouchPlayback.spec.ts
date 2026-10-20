import { test, expect } from './fixtures';

// Touch actions remain direct and visibility follows disclosure rather than simulated hover.
test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(window, 'Capacitor', { configurable: true, value: { getPlatform: () => 'android' } }));
    await page.setViewportSize({ width: 1000, height: 450 });
});
test('compact transport, disclosure idle and immersive visibility', async ({ page }) => {
    await page.clock.install();
    await page.goto('/dev-probe.html?probe=androidTouchPlayback');
    const bar = page.locator('[data-folia-player-bar-touch]');
    await expect(bar).toHaveAttribute('data-folia-player-bar-expanded', 'false');
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByRole('button', { name: 'Next track', exact: true }).click();
    await expect(page.locator('[data-play]')).toHaveAttribute('data-play', '1');
    await expect(page.locator('[data-next]')).toHaveAttribute('data-next', '1');
    await expect(bar).toHaveAttribute('data-folia-player-bar-expanded', 'false');
    await page.getByRole('button', { name: 'Expand player controls' }).click();
    await expect(bar).toHaveAttribute('data-folia-player-bar-expanded', 'true');
    const previous = page.getByRole('button', { name: 'Previous track', exact: true });
    expect((await previous.boundingBox())!.width).toBeGreaterThanOrEqual(44);
    await page.clock.runFor(4100);
    await expect(bar).toHaveAttribute('data-folia-player-bar-expanded', 'false');
    await page.clock.runFor(9700);
    await expect(page.locator('html')).toHaveAttribute('data-folia-android-immersive', 'visible');
    await page.clock.runFor(500);
    await expect(page.locator('html')).toHaveAttribute('data-folia-android-immersive', 'hidden');
    await expect(bar).toBeVisible();
    await page.mouse.click(800, 100);
    await expect(page.locator('html')).toHaveAttribute('data-folia-android-immersive', 'visible');
    await page.getByRole('button', { name: 'Also auto-hide playback controls', exact: true }).click();
    await page.clock.runFor(10100);
    await expect(page.locator('[data-folia-player-chrome]')).toHaveAttribute('aria-hidden', 'true');
    await page.mouse.click(800, 100);
    await expect(page.locator('[data-folia-player-chrome]')).not.toHaveAttribute('aria-hidden', 'true');
});
test('seeking holds disclosure open until release', async ({ page }) => {
    await page.clock.install();
    await page.goto('/dev-probe.html?probe=androidTouchPlayback');
    await page.getByRole('button', { name: 'Expand player controls' }).click();
    const slider = page.locator('[data-folia-player-bar-progress] input');
    const box = (await slider.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.clock.runFor(5000);
    await expect(page.locator('[data-folia-player-bar-touch]')).toHaveAttribute('data-folia-player-bar-expanded', 'true');
    await page.mouse.up();
    await page.clock.runFor(4100);
    await expect(page.locator('[data-folia-player-bar-touch]')).toHaveAttribute('data-folia-player-bar-expanded', 'false');
});
test('two-finger zoom anchors the camera and switches back to panning without a jump', async ({ page }) => {
    await page.goto('/dev-probe.html?probe=androidTouchWall');
    const field = page.getByTestId('touch-wall');
    await expect(field).toHaveAttribute('data-focused', /\d/);
    const cdp = await page.context().newCDPSession(page);
    const point = (id: number, x: number, y: number) => ({ id, x, y, radiusX: 2, radiusY: 2 });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(0, 300, 200), point(1, 600, 200)] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point(0, 250, 200), point(1, 650, 200)] });
    const zoomed = JSON.parse((await field.getAttribute('data-camera'))!);
    expect(zoomed.scale).toBeCloseTo(0.8, 2);
    expect((450 - zoomed.x) / zoomed.scale).toBeCloseTo((450 - 100) / 0.6, 2);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [point(1, 650, 200)] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point(0, 270, 200)] });
    await expect.poll(async () => JSON.parse((await field.getAttribute('data-camera'))!).x - zoomed.x).toBeCloseTo(20, 0);
    const panned = JSON.parse((await field.getAttribute('data-camera'))!);
    expect(panned.scale).toBeCloseTo(zoomed.scale, 2);
    expect(panned.x - zoomed.x).toBeCloseTo(20, 0);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
});
test('custom cache ceiling applies only after confirmation', async ({ page }) => {
    await page.goto('/dev-probe.html?probe=androidPerformanceSettings');
    await page.getByRole('combobox', { name: 'Cache size limit' }).click();
    await page.getByRole('option', { name: 'Custom', exact: true }).click();
    const custom = page.getByRole('spinbutton', { name: 'Custom', exact: true });
    await custom.fill('3.75');
    expect(await page.evaluate(() => localStorage.getItem('folia_media_cache_limit_gb'))).toBeNull();
    await page.getByRole('button', { name: 'Apply', exact: true }).click();
    expect(await page.evaluate(() => localStorage.getItem('folia_media_cache_limit_gb'))).toBe('3.75');
    await custom.fill('');
    await expect(page.getByRole('button', { name: 'Apply', exact: true })).toBeDisabled();
});
test('AI presets select models and fall back to manual entry', async ({ page }) => {
    await page.route('https://api.deepseek.com/v1/models', route => route.fulfill({ json: { data: [{ id: 'test-chat' }, { id: 'test-reasoner' }] } }));
    await page.goto('/dev-probe.html?probe=androidAiSettings');
    await page.getByRole('combobox', { name: 'AI provider' }).click();
    await page.getByRole('option', { name: 'DeepSeek', exact: true }).click();
    await expect(page.getByLabel('Compatible API URL')).toHaveCount(0);
    await page.locator('input[type=password]').fill('test-key');
    await page.getByRole('button', { name: 'Refresh models' }).click();
    await page.getByRole('combobox', { name: 'Model', exact: true }).click();
    await page.getByRole('option', { name: 'test-chat', exact: true }).click();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('foliaAiProviderSettings')!).openaiApiModel)).toBe('test-chat');
    await page.getByRole('button', { name: 'Enter model manually' }).click();
    await page.getByRole('textbox', { name: 'Model', exact: true }).fill('custom-model');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('foliaAiProviderSettings')!).openaiApiModel)).toBe('custom-model');
});

test('random pool keeps at least one style and manual style selection exits random', async ({ page }) => {
    await page.goto('/dev-probe.html?probe=androidAdaptation');
    await page.locator('[data-visualizer-style="__random__"]').click();
    const pool = page.getByRole('region', { name: 'Random pool', exact: true });
    await expect(pool).toBeVisible();
    const choices = pool.locator('button[aria-pressed]');
    const count = await choices.count();
    for (let index = 1; index < count; index++) await choices.nth(index).click();
    await choices.first().click();
    await expect(choices.first()).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('random_visualizer_modes')!).length)).toBe(1);
    await page.locator('[data-visualizer-style="sonnet"]').click();
    expect(await page.evaluate(() => localStorage.getItem('random_visualizer_mode_per_song'))).toBe('false');
});
test('expanded queue card fits above the compact transport in landscape', async ({ page }) => {
    await page.goto('/dev-probe.html?probe=lattice');
    const poster = page.locator('.lattice-queue-root .lattice-poster.is-expanded');
    await expect(poster).toBeVisible();
    await expect.poll(async () => (await poster.boundingBox())!.height).toBeCloseTo(282, 0);
    await expect.poll(async () => (await poster.boundingBox())!.y).toBeGreaterThanOrEqual(0);
    const box = (await poster.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThan(320);
    const buttons = poster.locator('.lattice-chrome button');
    await expect.poll(async () => (await buttons.first().boundingBox())!.width).toBeGreaterThanOrEqual(43.5);
    for (let index = 0; index < await buttons.count(); index++) {
        const button = (await buttons.nth(index).boundingBox())!;
        expect(button.width).toBeGreaterThanOrEqual(43.5);
        expect(button.x).toBeGreaterThanOrEqual(box.x - 1);
        expect(button.x + button.width).toBeLessThanOrEqual(box.x + box.width + 1);
    }
    await page.screenshot({ path: 'test-results/android-lattice-landscape.png' });
});


test('narrow edge progress expands horizontally and opens now playing', async ({ page }) => {
    await page.goto('/dev-probe.html?probe=androidTouchPlayback');
    const bar = page.locator('[data-folia-player-bar-touch]');
    await expect.poll(async () => (await bar.boundingBox())!.width).toBeCloseTo(260, 0);
    const cover = (await page.locator('.touch-player-cover').boundingBox())!;
    const compact = (await bar.boundingBox())!;
    expect(cover.x - compact.x).toBeCloseTo(cover.y - compact.y, 0);
    expect(compact.y + compact.height - cover.y - cover.height).toBeCloseTo(cover.y - compact.y, 0);
    const rail = (await bar.locator('[data-folium-part="progress.track"]').boundingBox())!;
    expect(compact.y + compact.height - rail.y - rail.height).toBeLessThanOrEqual(2);
    await expect(page.locator('.touch-player-title')).toHaveAttribute('data-overflow', 'true');
    await page.getByRole('button', { name: 'Expand player controls' }).click();
    await expect.poll(async () => (await bar.boundingBox())!.width).toBeCloseTo(520, 0);
    expect((await bar.boundingBox())!.height).toBeCloseTo(compact.height, 0);
    await bar.locator('input[type=range]').fill('100');
    await expect(bar.locator('.touch-player-edge path:last-child')).toHaveCSS('stroke-dashoffset', '0.5px');
    await page.getByRole('button', { name: 'Now playing', exact: true }).click();
    await expect(page.locator('[data-navigated]')).toHaveAttribute('data-navigated', '1');
    await expect(page.locator('[data-play]')).toHaveAttribute('data-play', '0');
});

for (const compactStyle of ['text', 'progress']) {
    test(compactStyle + ' compact appearance retains disclosure and seek', async ({ page }) => {
        await page.addInitScript(style => localStorage.setItem('touch_player_bar_appearance', JSON.stringify({ compactStyle: style, expansion: 'tall' })), compactStyle);
        await page.goto('/dev-probe.html?probe=androidTouchPlayback');
        const bar = page.locator('[data-folia-player-bar-touch]');
        await expect(bar.locator('.touch-player-cover')).toHaveCount(0);
        await page.getByRole('button', { name: 'Expand player controls' }).click();
        await expect(bar).toHaveAttribute('data-folia-player-bar-expanded', 'true');
        await expect(bar.locator('.touch-player-edge path:last-child')).toHaveCSS('stroke-dashoffset', '0.79px');
        await page.getByRole('button', { name: 'Now playing', exact: true }).click();
        await expect(page.locator('[data-navigated]')).toHaveAttribute('data-navigated', '1');
        const slider = bar.locator('input[type=range]');
        await slider.fill('100');
        await expect(page.locator('[data-seek]')).toHaveAttribute('data-seek', '1');
    });
}

test('wide expansion wraps on portrait screens and respects reduced motion', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/dev-probe.html?probe=androidTouchPlayback');
    expect(await page.locator('.touch-player-title > span').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
    await page.getByRole('button', { name: 'Expand player controls' }).click();
    const bar = page.locator('[data-folia-player-bar-touch]');
    await expect.poll(async () => (await bar.boundingBox())!.width).toBeCloseTo(296, 0);
    const previous = (await page.locator('[data-touch-player-prev]').boundingBox())!;
    const next = (await page.locator('[data-touch-player-next]').boundingBox())!;
    expect(previous.width).toBeGreaterThanOrEqual(44);
    expect(next.width).toBeGreaterThanOrEqual(44);
    expect(next.x + next.width).toBeLessThanOrEqual(320);
    await page.getByRole('button', { name: 'Now playing', exact: true }).click();
    await expect(page.locator('[data-navigated]')).toHaveAttribute('data-navigated', '1');
});

test('appearance selectors update the live player and persist together', async ({ page }) => {
    await page.goto('/dev-probe.html?probe=androidTouchPlayback');
    await page.getByRole('combobox', { name: 'Compact player', exact: true }).click();
    await page.getByRole('option', { name: 'Without cover', exact: true }).click();
    await expect(page.locator('.touch-player-cover')).toHaveCount(0);
    await page.getByRole('combobox', { name: 'Expand player', exact: true }).click();
    await page.getByRole('option', { name: 'Vertically', exact: true }).click();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('touch_player_bar_appearance')!)))
        .toEqual({ compactStyle: 'text', expansion: 'tall' });
    await page.getByRole('button', { name: 'Expand player controls' }).click();
    await expect.poll(async () => (await page.locator('[data-folia-player-bar-touch]').boundingBox())!.height).toBeGreaterThan(100);
    await page.getByRole('button', { name: 'Now playing', exact: true }).click();
    await expect(page.locator('[data-navigated]')).toHaveAttribute('data-navigated', '1');
});
