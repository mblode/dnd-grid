export function SiteFooter() {
  return (
    <footer className="mt-auto py-8 text-center text-sm">
      <div className="container-wrapper">
        <span className="text-muted-foreground">Built by</span>{" "}
        <a
          className="underline-offset-2 hover:underline"
          href="https://matthewblode.com"
          rel="noopener noreferrer"
          target="_blank"
        >
          Matthew Blode
        </a>
      </div>
    </footer>
  );
}
