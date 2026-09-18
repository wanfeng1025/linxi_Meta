import { ImageResponse } from 'next/og';

export const alt = '灵犀 Meta｜匿名、可复核的三币起卦';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '76px 92px',
        color: '#f7efd9',
        background: 'linear-gradient(135deg, #0d2b25, #245449)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ color: '#d6aa57', fontSize: 28, letterSpacing: 10 }}>
          观象 · 记数 · 可复核
        </div>
        <div style={{ fontSize: 82, fontWeight: 700 }}>灵犀 Meta</div>
        <div style={{ color: '#e9ddc2', fontSize: 34 }}>匿名、会话内的三币六爻结构工具</div>
      </div>
      <div
        style={{
          width: 250,
          height: 250,
          border: '20px solid #d6aa57',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#d6aa57',
          fontSize: 118,
        }}
      >
        ☯
      </div>
    </div>,
    size,
  );
}
