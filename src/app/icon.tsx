import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 32,
  height: 32,
};

export const contentType = 'image/png';

export default function Icon() {
  // PNG gerado automaticamente (maior compatibilidade que SVG como favicon)
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000000',
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {/* Pilares do monograma */}
          <div
            style={{
              position: 'absolute',
              left: 8,
              top: 6,
              width: 4,
              height: 16,
              borderRadius: 3,
              background: 'rgba(255,255,255,0.92)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: 8,
              top: 6,
              width: 4,
              height: 16,
              borderRadius: 3,
              background: 'rgba(255,255,255,0.92)',
            }}
          />

          {/* Traço ascendente (acento) */}
          <svg width="28" height="28" viewBox="0 0 28 28">
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#ffcc02" />
                <stop offset="1" stopColor="#e6b800" />
              </linearGradient>
            </defs>
            <path
              d="M8.2 17.2l5-5 2.6 2.6 5.2-5.2"
              fill="none"
              stroke="url(#g)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="21.2" cy="10.6" r="1.9" fill="#ffcc02" />
          </svg>
        </div>
      </div>
    ),
    size
  );
}

