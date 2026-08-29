import type { Metadata } from "next";

import { EditorWorkspace } from "@/components/editor-workspace";

export const metadata: Metadata = {
  title: "Editor — Monolith",
};

export default function EditorPage() {
  return <EditorWorkspace />;
}
