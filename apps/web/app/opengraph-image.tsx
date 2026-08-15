import { renderZoneOgImage } from "@/app/og-image-shared";
import { OgLogo } from "@/app/og-logo";

export {
  OG_CONTENT_TYPE as contentType,
  OG_SIZE as size,
} from "@/app/og-image-shared";

export const alt = "DnD Grid";

/**
 * The house card (Rule 12), replacing the static `opengraph-image.png`.
 *
 * Converting the PNG to a generated route is also the Rule 11 fix, which is
 * why `metadataBase` moves to the zone URL in the same commit. A static
 * metadata image already carries `basePath`, so pointing `metadataBase` at the
 * zone while the PNG is still there produces
 * `/dnd-grid/dnd-grid/opengraph-image.png`. A generated route is not prefixed,
 * so this form is the one that cannot double.
 *
 * The matching `twitter-image.png` is gone rather than converted: Next reuses
 * this route for `twitter:image`, and the old pair were the same file twice.
 */
export default function OpengraphImage() {
  return renderZoneOgImage({
    background: "#0f172a",
    color: "#f8fafc",
    logo: <OgLogo />,
    title: "DnD Grid",
  });
}
