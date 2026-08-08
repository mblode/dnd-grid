interface JsonLdProps {
  data: Record<string, unknown>;
}

/** Emits a single application/ld+json block. Static schema only — no user input. */
export const JsonLd = ({ data }: JsonLdProps) => (
  <script
    // oxlint-disable-next-line react/no-danger -- JSON-LD must be raw script content.
    dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    type="application/ld+json"
  />
);
