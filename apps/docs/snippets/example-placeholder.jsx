import { ExampleFrame } from "./example-frame.jsx";

export function ExamplePlaceholder({ title, description }) {
  return (
    <ExampleFrame>
      <div className="space-y-2">
        <div className="text-sm font-semibold text-zinc-900 dark:text-white">
          {title}
        </div>
        {description ? (
          <p className="text-sm text-zinc-600 dark:text-white/70">
            {description}
          </p>
        ) : null}
        <p className="text-xs text-zinc-500 dark:text-white/50">
          Interactive preview is unavailable in Mintlify snippets. Use the
          installation or manual code below to run it locally.
        </p>
      </div>
    </ExampleFrame>
  );
}
