---
"@dnd-grid/react": patch
---

Fix stacking order for interactive grid items by ensuring active drag layers are deterministic and adding a regression test for z-index precedence. Also pin the external drag overlay z-index in the web example to avoid overlay regressions.
