export function SiteFooter() {
  return (
    <footer className="mt-auto py-8 text-center text-sm">
      <div className="container-wrapper">
        <span className="text-muted-foreground">Built by</span>{" "}
        <a
          href="https://matthewblode.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:underline"
        >
          Matthew Blode
        </a>
      </div>
    </footer>
  );
}
