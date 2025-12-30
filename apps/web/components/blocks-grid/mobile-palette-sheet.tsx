import type { ReactNode } from "react";
import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export const MobilePaletteSheet = ({ open, onClose, children }: Props) => {
  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col lg:hidden"
      role="dialog"
    >
      <button
        aria-label="Close block palette"
        className="absolute inset-0 bg-transparent"
        onClick={onClose}
        type="button"
      />
      <div className="relative mt-auto w-full pt-2">{children}</div>
    </div>
  );
};
