"use client";

interface Props {
  h: number;
  scaleFactor: number;
  content?: Record<string, unknown>;
}

export function LinkBlock({ h, scaleFactor, content }: Props) {
  const label = (content?.label as string) || "Click me";
  const isCompact = h <= 3;

  return (
    <div className="link-block h-full flex items-center justify-center p-3">
      <div
        className={`link-block-button ${isCompact ? "link-block-button-compact" : ""}`}
        style={{
          fontSize: `${Math.max(12, 16 * scaleFactor)}px`,
        }}
      >
        <svg
          className="link-block-icon"
          width={isCompact ? 16 : 20}
          height={isCompact ? 16 : 20}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
        {!isCompact && <span className="link-block-label">{label}</span>}
      </div>
    </div>
  );
}
