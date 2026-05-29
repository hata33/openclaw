# markdown — API

```typescript
function parseMarkdownIR(text: string, options?: { tableMode?: MarkdownTableMode }): MarkdownIR[]
function renderMarkdownIR(ir: MarkdownIR[], styleMap: RenderStyleMap): string
function renderAwareChunk<TRendered>(ir: MarkdownIR[], options: { maxLength: number; render: (ir: MarkdownIR[]) => TRendered }): RenderedMarkdownChunk<TRendered>[]
function parseFenceSpans(text: string): FenceSpan[]
function parseFrontmatter(text: string): ParsedFrontmatter
```
