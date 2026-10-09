'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  sublabel?: string;
  inline?: boolean;
}

export default function LoadingSpinner({
  size = 'md',
  label,
  sublabel,
  inline = false,
}: LoadingSpinnerProps) {
  const pixelSize = size === 'sm' ? '18px' : size === 'lg' ? '36px' : '26px';
  const borderWidth = size === 'sm' ? '2px' : size === 'lg' ? '3px' : '2.5px';

  if (inline) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <span
          className="spinner"
          style={{
            width: pixelSize,
            height: pixelSize,
            borderWidth,
            flexShrink: 0,
          }}
        />
        {label && <span style={{ fontSize: '0.88rem' }}>{label}</span>}
      </span>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem 1rem',
        textAlign: 'center',
      }}
    >
      <div
        className="spinner"
        style={{
          width: pixelSize,
          height: pixelSize,
          borderWidth,
          marginBottom: label ? '0.85rem' : '0',
        }}
      />
      {label && (
        <div style={{ fontWeight: 600, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
          {label}
        </div>
      )}
      {sublabel && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          {sublabel}
        </p>
      )}
    </div>
  );
}
