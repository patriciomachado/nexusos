import { Fragment } from 'react'
import Link from 'next/link'

/**
 * Minimal, safe formatting for Alice's answers: paragraphs, "- " lists,
 * **bold** / *bold* and links. No HTML is ever injected.
 */
export function RichText({ text }: { text: string }) {
    const blocks: { type: 'p' | 'ul' | 'ol'; lines: string[] }[] = []
    for (const raw of text.split('\n')) {
        const line = raw.trimEnd()
        const bullet = /^\s*[-•*]\s+(.*)$/.exec(line)
        const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line)
        const last = blocks[blocks.length - 1]
        if (bullet) {
            if (last?.type === 'ul') last.lines.push(bullet[1])
            else blocks.push({ type: 'ul', lines: [bullet[1]] })
        } else if (numbered) {
            if (last?.type === 'ol') last.lines.push(numbered[1])
            else blocks.push({ type: 'ol', lines: [numbered[1]] })
        } else if (!line.trim()) {
            blocks.push({ type: 'p', lines: [] })
        } else if (last?.type === 'p' && last.lines.length) {
            last.lines.push(line)
        } else {
            blocks.push({ type: 'p', lines: [line.replace(/^#+\s*/, '')] })
        }
    }
    return (
        <div className="space-y-2">
            {blocks.filter(b => b.lines.length).map((b, i) =>
                b.type === 'p' ? (
                    <p key={i} className="whitespace-pre-wrap break-words">{b.lines.map((l, j) => <Fragment key={j}>{j > 0 && '\n'}<Inline text={l} /></Fragment>)}</p>
                ) : b.type === 'ul' ? (
                    <ul key={i} className="list-disc pl-5 space-y-1">{b.lines.map((l, j) => <li key={j}><Inline text={l} /></li>)}</ul>
                ) : (
                    <ol key={i} className="list-decimal pl-5 space-y-1">{b.lines.map((l, j) => <li key={j}><Inline text={l} /></li>)}</ol>
                )
            )}
        </div>
    )
}

function Inline({ text }: { text: string }) {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|https?:\/\/[^\s)]+|\/(?:service-orders|customers|tarefas|appointments|inventory|devices)\/?[\w\-?=&/]*)/g)
    return (
        <>
            {parts.map((p, i) => {
                if (!p) return null
                if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>
                if (/^\*[^*]+\*$/.test(p)) return <strong key={i} className="font-semibold">{p.slice(1, -1)}</strong>
                if (/^https?:\/\//.test(p)) return <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 break-all">{p}</a>
                if (p.startsWith('/')) return <Link key={i} href={p} className="text-primary underline underline-offset-2">{p}</Link>
                return <Fragment key={i}>{p}</Fragment>
            })}
        </>
    )
}
