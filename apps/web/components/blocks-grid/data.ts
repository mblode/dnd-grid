import type { GridItem, PaletteItem } from "./types";

export const paletteItems: PaletteItem[] = [
  {
    kind: "text",
    name: "Text",
    title: "Howdy!",
    description: "Headline with supporting body copy.",
    w: 2,
    h: 4,
  },
  {
    kind: "media",
    name: "Media",
    title: "Sunset",
    description: "Image-first block with a caption.",
    w: 2,
    h: 4,
  },
  {
    kind: "quote",
    name: "Quote",
    title: "Less is more",
    description: "Pull quote with attribution.",
    w: 2,
    h: 4,
  },
];

export const initialItems: GridItem[] = [
  {
    id: "a",
    kind: "text",
    name: "Text",
    title: "Howdy!",
    x: 0,
    y: 0,
    w: 4,
    h: 4,
  },
  {
    id: "b",
    kind: "media",
    name: "Media",
    title: "Sunset",
    x: 0,
    y: 4,
    w: 2,
    h: 4,
  },
  {
    id: "d",
    kind: "quote",
    name: "Quote",
    title: "Less is more",
    x: 3,
    y: 4,
    w: 2,
    h: 4,
  },
];
