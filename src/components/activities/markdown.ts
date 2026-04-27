// Minimal safe markdown renderer for activity notes.
// Supports: **bold**, *italic*, `code`, bullet/numbered lists, [text](http://url), line breaks.
// Escapes HTML first; output is safe for dangerouslySetInnerHTML.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function renderMarkdown(input: string): string {
  if (!input) return ''
  let text = escapeHtml(input)

  text = text.replace(/`([^`\n]+)`/g, '<code class="bg-char-3 text-cream/90 px-1 rounded text-xs">$1</code>')
  text = text.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>')
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-gold underline">$1</a>')

  const lines = text.split('\n')
  const out: string[] = []
  let listType: 'ul' | 'ol' | null = null
  for (const raw of lines) {
    const bullet = /^\s*[-*]\s+(.*)$/.exec(raw)
    const numbered = /^\s*\d+\.\s+(.*)$/.exec(raw)
    if (bullet) {
      if (listType !== 'ul') { if (listType) out.push(`</${listType}>`); out.push('<ul class="list-disc pl-5">'); listType = 'ul' }
      out.push(`<li>${bullet[1]}</li>`)
    } else if (numbered) {
      if (listType !== 'ol') { if (listType) out.push(`</${listType}>`); out.push('<ol class="list-decimal pl-5">'); listType = 'ol' }
      out.push(`<li>${numbered[1]}</li>`)
    } else {
      if (listType) { out.push(`</${listType}>`); listType = null }
      out.push(raw)
    }
  }
  if (listType) out.push(`</${listType}>`)

  return out.join('\n').replace(/\n{2,}/g, '</p><p class="mt-2">').replace(/\n/g, '<br>').replace(/^(.)/, '<p>$1').concat('</p>')
}
