export type BlockKind = "text" | "media" | "quote";

export type PaletteItem = {
  kind: BlockKind;
  name: string;
  title: string;
  description: string;
  w: number;
  h: number;
};

export type GridItem = {
  id: string;
  kind: BlockKind;
  name: string;
  title: string;
  w: number;
  h: number;
  x: number;
  y: number;
};
