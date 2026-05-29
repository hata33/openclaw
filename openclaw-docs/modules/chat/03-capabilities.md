# chat — API

```typescript
// canvas-render.ts
function tryParseJsonRecord(value: string | undefined): Record<string, unknown> | undefined
type CanvasPreview = { kind: "canvas"; surface: CanvasSurface; render: "url"; ... }

// tool-content.ts
function isToolCallContentType(value: unknown): boolean
function isToolResultContentType(value: unknown): boolean
function isToolCallBlock(block: ToolContentBlock): boolean
function isToolResultBlock(block: ToolContentBlock): boolean
function resolveToolBlockArgs(block: ToolContentBlock): unknown
function resolveToolUseId(block: ToolContentBlock): string | undefined
```
