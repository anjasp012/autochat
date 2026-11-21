import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ExternalLink } from 'lucide-react';

interface Props {
    content: string;
    className?: string;
}

export default function ChatMarkdown({ content, className = '' }: Props) {
    // Normalisasi line break: di dalam pesan chat atau opening announcement, setiap enter (newline)
    // dari admin/user harus tetap turun ke baris berikutnya (hard break), bukan bablas ke samping.
    const formattedContent = React.useMemo(() => {
        if (!content) return '';
        let text = content.replace(/\r\n/g, '\n');

        // Jika teks berisi beberapa link atau kata kunci (WHATSAPP, TELEGRAM, dll.) yang menumpuk di 1 baris,
        // rapikan otomatis dengan memisahkannya ke baris baru agar rapi menurun
        text = text.replace(/([^\n])\s*(?:️|\uFE0F)?\s*(https?:\/\/[^\s]+)/gi, '$1\n👉 $2');
        text = text.replace(/([^\n])\s+(WHATSAPP|TELEGRAM|LIVECHAT|LINK ANTI NAWALA|LINK ALTERNATIF)/gi, '$1\n\n**$2**');

        // Tambahkan dua trailing spasi pada setiap baris berteks agar diinterpretasikan sebagai hard line break (<br />) oleh Markdown
        return text
            .split('\n')
            .map((line) => (line.trim() === '' ? '' : `${line}  `))
            .join('\n');
    }, [content]);

    return (
        <div className={`prose prose-sm dark:prose-invert max-w-none text-inherit leading-relaxed ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0 whitespace-pre-line">{children}</p>,
                    h1: ({ children }) => <h1 className="text-base font-bold my-2">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-sm font-bold my-2">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-xs font-bold my-1.5">{children}</h3>,
                    ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                    li: ({ children }) => <li>{children}</li>,
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-3 border-primary/50 pl-2.5 my-2 italic text-xs opacity-90">
                            {children}
                        </blockquote>
                    ),
                    table: ({ children }) => (
                        <div className="overflow-x-auto my-2.5 rounded-lg border border-border/80 text-xs">
                            <table className="min-w-full divide-y divide-border/80">{children}</table>
                        </div>
                    ),
                    thead: ({ children }) => <thead className="bg-muted/70 font-semibold">{children}</thead>,
                    tbody: ({ children }) => <tbody className="divide-y divide-border/60 bg-background/50">{children}</tbody>,
                    tr: ({ children }) => <tr className="hover:bg-muted/30 transition-colors">{children}</tr>,
                    th: ({ children }) => <th className="px-2.5 py-1.5 text-left font-semibold text-[11px]">{children}</th>,
                    td: ({ children }) => <td className="px-2.5 py-1.5 text-[11px] align-top">{children}</td>,
                    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                    a: ({ href, children }) => (
                        <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 underline underline-offset-2 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors break-all"
                        >
                            <span>{children}</span>
                            <ExternalLink className="size-3 shrink-0 inline opacity-70" />
                        </a>
                    ),
                    code: ({ children }) => (
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{children}</code>
                    ),
                }}
            >
                {formattedContent}
            </ReactMarkdown>
        </div>
    );
}
