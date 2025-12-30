export type BlockKind = "text" | "media" | "quote";

export interface PaletteItem {
  kind: BlockKind;
  name: string;
  title: string;
  description: string;
  w: number;
  h: number;
}

export interface GridItem {
  id: string;
  kind: BlockKind;
  name: string;
  title: string;
  w: number;
  h: number;
  x: number;
  y: number;
}
