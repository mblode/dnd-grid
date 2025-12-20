"use client";

interface Props {
  h: number;
  scaleFactor: number;
  content?: Record<string, unknown>;
}

export function TextBlock({ h, scaleFactor, content }: Props) {
  const text = (content?.text as string) || "Add your text here";
  const isCompact = h <= 3;

  return (
    <div className="text-block h-full flex items-center justify-center p-3 overflow-hidden">
      <p
        className={`text-block-content ${isCompact ? "text-block-compact" : ""}`}
        style={{
          fontSize: `${Math.max(12, (isCompact ? 14 : 16) * scaleFactor)}px`,
          lineHeight: 1.4,
        }}
      >
        {text}
      </p>
    </div>
  );
}
