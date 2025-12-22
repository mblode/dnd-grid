export function SiteFooter() {
  return (
    <footer className="mt-auto py-8 text-center text-sm text-muted-foreground">
      <div className="container-wrapper">
        Built by{" "}
        <a
          href="https://matthewblode.com"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors underline-offset-2 hover:underline hover:text-foreground"
        >
          Matthew Blode
        </a>
      </div>
    </footer>
  );
}
