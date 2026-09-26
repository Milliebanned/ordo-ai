import React from 'react';

// Four-point sparkle, drawn as SVG so it renders the same everywhere (no emoji glyphs).
export default function Sparkle({ size = '1em' }) {
  return (
    <svg className="sparkle" width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M8 .8C8.55 5.1 10.9 7.45 15.2 8 10.9 8.55 8.55 10.9 8 15.2 7.45 10.9 5.1 8.55.8 8 5.1 7.45 7.45 5.1 8 .8Z" />
    </svg>
  );
}
