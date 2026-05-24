'use client';
import { useState } from 'react';

export type AvatarStyle = 'avataaars' | 'lorelei' | 'micah' | 'pixel-art' | 'fun-emoji' | 'bottts';

export const AVATAR_STYLES: { value: AvatarStyle; label: string }[] = [
  { value: 'avataaars',  label: 'Cartoon' },
  { value: 'lorelei',   label: 'Portrait' },
  { value: 'micah',     label: 'Illustrated' },
  { value: 'pixel-art', label: 'Pixel Art' },
  { value: 'fun-emoji', label: 'Emoji' },
  { value: 'bottts',    label: 'Robot' },
];

const BG = 'b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf,a8e6cf,ffeaa7';

const PALETTE = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16'];
function seedColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

export function avatarUrl(seed: string, style: AvatarStyle = 'avataaars') {
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${BG}`;
}

interface AvatarProps {
  seed: string;
  size?: number;
  className?: string;
  borderColor?: string;
  avatarStyle?: AvatarStyle;
}

export function Avatar({ seed, size = 32, className = '', borderColor, avatarStyle = 'avataaars' }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const color = seedColor(seed);

  return (
    <div
      className={`rounded-full overflow-hidden flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        border: borderColor ? `2.5px solid ${borderColor}` : undefined,
        backgroundColor: failed ? color : undefined,
      }}
    >
      {failed ? (
        <div className="w-full h-full flex items-center justify-center text-white font-bold select-none"
          style={{ fontSize: Math.max(10, Math.round(size * 0.38)) }}>
          {seed.charAt(0).toUpperCase()}
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl(seed, avatarStyle)}
          alt={seed}
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      )}
    </div>
  );
}
