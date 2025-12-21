import { cn } from "@/lib/utils";

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function PageHeader({ className, children, ...props }: PageHeaderProps) {
  return (
    <section
      className={cn(
        "container-wrapper flex flex-col items-start gap-2 px-8 pt-8 pb-8 md:pt-12 md:pb-10",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

interface PageHeaderHeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

export function PageHeaderHeading({
  className,
  children,
  ...props
}: PageHeaderHeadingProps) {
  return (
    <h1
      className={cn(
        "text-3xl font-bold leading-tight tracking-tighter md:text-4xl lg:text-5xl lg:leading-[1.1]",
        className,
      )}
      {...props}
    >
      {children}
    </h1>
  );
}

interface PageHeaderDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export function PageHeaderDescription({
  className,
  children,
  ...props
}: PageHeaderDescriptionProps) {
  return (
    <p
      className={cn(
        "max-w-2xl text-balance text-lg font-light text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}

interface PageActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function PageActions({
  className,
  children,
  ...props
}: PageActionsProps) {
  return (
    <div
      className={cn("flex w-full items-center gap-2 pt-2", className)}
      {...props}
    >
      {children}
    </div>
  );
}
