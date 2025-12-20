"use client";

interface Props {
  scaleFactor: number;
  content?: Record<string, unknown>;
}

export function ImageBlock({ scaleFactor, content }: Props) {
  const src = content?.src as string;
  const alt = (content?.alt as string) || "Image";

  // If no src, show placeholder
  if (!src) {
    return (
      <div className="image-block h-full flex flex-col items-center justify-center p-3 text-gray-400">
        <svg
          width={Math.max(24, 32 * scaleFactor)}
          height={Math.max(24, 32 * scaleFactor)}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <span
          className="mt-2 text-xs"
          style={{ fontSize: `${Math.max(10, 12 * scaleFactor)}px` }}
        >
          Add image
        </span>
      </div>
    );
  }

  return (
    <div className="image-block h-full overflow-hidden rounded-lg">
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover pointer-events-none"
        draggable={false}
      />
    </div>
  );
}
