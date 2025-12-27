export interface BlockData {
  id: string;
  title: string;
  type: "link" | "header" | "text";
  url?: string;
  visible: boolean;
  order: number;
  pageId: string;
}

export type DropPosition = "above" | "below" | null;
