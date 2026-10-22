import { afterEach, describe, expect, it, vi } from 'vitest';
import { COMMAND_PALETTE_COMMANDS, isCommandPaletteCommandEnabled } from '@/components/command-palette/commandRegistry';

// test/unit/command-palette/androidSettings.test.ts
afterEach(() => vi.unstubAllGlobals());
describe('Android settings command availability', () => {
    const enabled = (id: string) => isCommandPaletteCommandEnabled(COMMAND_PALETTE_COMMANDS.find(command => command.id === id)!);
    it('hides desktop-only controls and keeps touch settings available', () => {
        vi.stubGlobal('window', { Capacitor: { getPlatform: () => 'android' } });
        expect(enabled('settings-custom-shortcut')).toBe(false);
        expect(enabled('settings-toggle-main-window-titlebar')).toBe(false);
        expect(enabled('settings-toggle-cursor-auto-hide')).toBe(false);
        expect(enabled('settings-grid-action-button')).toBe(true);
    });
    it('retains keyboard and pointer settings in ordinary browsers', () => {
        vi.stubGlobal('window', {});
        expect(enabled('settings-custom-shortcut')).toBe(true);
        expect(enabled('settings-toggle-cursor-auto-hide')).toBe(true);
    });
    it('retains window controls in Electron', () => {
        vi.stubGlobal('window', { electron: { platform: 'win32' } });
        expect(enabled('settings-toggle-main-window-titlebar')).toBe(true);
    });
});
