import React from 'react';
import { ListMusic, Radio, DiscAlbum, FolderOpen, Server, LayoutGrid } from 'lucide-react';

// src/components/shared/HomeTabIcon.tsx
// Map semantic tab IDs, never translated one-character abbreviations.
const icons = { playlist: ListMusic, radio: Radio, albums: DiscAlbum, local: FolderOpen, navidrome: Server };
export default function HomeTabIcon({ tab }: { tab: string }) {
    const Icon = icons[tab as keyof typeof icons] ?? LayoutGrid;
    return <Icon size={18} aria-hidden="true" />;
}
