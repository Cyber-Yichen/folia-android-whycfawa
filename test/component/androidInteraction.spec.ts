import { test, expect } from './fixtures';

// Native list controls and viewport-aware menus remain usable without mouse hover or double clicks.
test.use({ hasTouch: true });
test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => Object.assign(window, { Capacitor: { getPlatform: () => 'android' } }));
    await page.setViewportSize({ width: 390, height: 700 });
});

test('a list play button plays once without locating, while the title locates without sticky hover', async ({ page, mount }) => {
    await mount('androidInteraction');
    const row = page.locator('[data-bravais-list-row="song:0"]');
    const play = row.getByRole('button', { name: 'Play Track 0', exact: true });
    const box = (await play.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await play.tap();
    await expect(page.locator('[data-played]')).toHaveAttribute('data-played', '1');
    await expect(page.locator('[data-located]')).toHaveAttribute('data-located', '0');
    await row.locator('strong').tap();
    await expect(page.locator('[data-located]')).toHaveAttribute('data-located', '1');
    await expect(page.locator('[data-played]')).toHaveAttribute('data-played', '1');
    await expect(page.locator('[data-linked]')).toHaveAttribute('data-linked', '');
    await expect(page.locator('[data-bravais-list-row="song:1"] button')).toBeDisabled();
    await expect(page.locator('[data-bravais-list-row="song:2"] .bravais-list-play')).toHaveCount(0);
    await page.getByRole('combobox', { name: 'Sort tracks', exact: true }).tap();
    await page.getByRole('option', { name: 'Artist', exact: true }).tap();
    await expect(page.getByRole('combobox', { name: 'Sort tracks', exact: true })).toContainText('Artist');
});

test('keyboard viewport changes keep the menu visible, and scrolling options does not measure the trigger again', async ({ page, mount }) => {
    await page.addInitScript(() => {
        const viewport = Object.assign(new EventTarget(), { width: 390, height: 700, offsetLeft: 0, offsetTop: 0 });
        Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
    });
    await mount('androidInteraction');
    const trigger = page.getByRole('combobox', { name: 'Long menu', exact: true });
    expect((await trigger.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await trigger.tap();
    const menu = page.getByRole('listbox', { name: 'Long menu', exact: true });
    await expect(menu.getByRole('option').first()).toHaveCSS('height', '44px');
    await page.evaluate(() => {
        Object.assign(window.visualViewport!, { height: 280, offsetTop: 200 });
        window.visualViewport!.dispatchEvent(new Event('resize'));
    });
    await expect.poll(async () => (await menu.boundingBox())!.y).toBeGreaterThanOrEqual(207);
    const box = (await menu.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(473);
    const measurements = await trigger.evaluate(async button => {
        const anchor = button.parentElement!;
        const original = anchor.getBoundingClientRect.bind(anchor);
        let reads = 0;
        anchor.getBoundingClientRect = () => { reads++; return original(); };
        const menu = document.getElementById(button.getAttribute('aria-controls')!)!;
        const scroller = menu.querySelector<HTMLElement>('.custom-scrollbar')!;
        scroller.scrollTop = 120;
        scroller.dispatchEvent(new Event('scroll'));
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        anchor.getBoundingClientRect = original;
        return reads;
    });
    expect(measurements).toBe(0);
    await page.keyboard.press('Escape');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});


test('desktop list rows retain mouse linking and double-click playback', async ({ page, mount }) => {
    await page.addInitScript(() => Object.assign(window, { Capacitor: { getPlatform: () => 'web' } }));
    await mount('androidInteraction');
    const row = page.locator('[data-bravais-list-row="song:0"]');
    await expect(row.locator('.bravais-list-play')).toHaveCount(0);
    await row.hover();
    await expect(page.locator('[data-linked]')).toHaveAttribute('data-linked', 'song:0');
    await row.dblclick();
    await expect(page.locator('[data-played]')).toHaveAttribute('data-played', '1');
    await page.locator('select[data-bravais-list-sort-field]').selectOption('artist');
    await expect(page.locator('select[data-bravais-list-sort-field]')).toHaveValue('artist');
});
