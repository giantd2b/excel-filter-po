import type { CSSProperties, ReactNode } from 'react';

export const charm: CSSProperties = { fontFamily: "'Charm', serif", fontWeight: 700 };

export function chipStyle(sel: boolean): CSSProperties {
  return {
    padding: '10px 15px',
    borderRadius: 999,
    fontSize: 14,
    cursor: 'pointer',
    borderWidth: 1.5,
    borderStyle: 'solid',
    ...(sel
      ? { background: 'var(--color-accent)', color: '#fff', borderColor: 'var(--color-accent)' }
      : {
          background: 'var(--color-neutral-100)',
          color: 'var(--color-neutral-700)',
          borderColor: 'var(--color-neutral-300)',
        }),
  };
}

export function cardStyle(sel: boolean, extra?: CSSProperties): CSSProperties {
  return {
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    borderWidth: 2,
    borderStyle: 'solid',
    ...(sel
      ? { background: 'var(--color-accent-100)', borderColor: 'var(--color-accent)' }
      : { background: 'var(--color-neutral-100)', borderColor: 'transparent' }),
    ...(extra || {}),
  };
}

export function checkStyle(on: boolean, color: string): CSSProperties {
  return {
    width: 24,
    height: 24,
    borderRadius: 8,
    display: 'grid',
    placeItems: 'center',
    flex: 'none',
    color: '#fff',
    fontSize: 14,
    background: on ? color : 'var(--color-neutral-300)',
  };
}

export const inputStyle: CSSProperties = {
  width: '100%',
  padding: '13px 18px',
  borderRadius: 999,
  border: '1.5px solid var(--color-neutral-300)',
  background: 'var(--color-neutral-100)',
  fontSize: 15,
  color: 'var(--color-text)',
};

export function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 14,
        color: 'var(--color-neutral-700)',
        cursor: 'pointer',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6"></path>
      </svg>
      {label}
    </div>
  );
}

export function SectionTitle({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <h2
      style={{
        ...charm,
        fontSize: 28,
        margin: '0 0 14px',
        color: 'var(--color-accent-900)',
        ...style,
      }}
    >
      {children}
    </h2>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 9, color: 'var(--color-neutral-800)' }}>
      {children}
    </div>
  );
}

export function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-accent-2-600)"
      strokeWidth="2.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: 'none', marginTop: 3 }}
    >
      <path d="M20 6L9 17l-5-5"></path>
    </svg>
  );
}

export function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.4 2.1L8.1 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.4 1.9.6 2.9.8a2 2 0 0 1 1.6 2z"></path>
    </svg>
  );
}
