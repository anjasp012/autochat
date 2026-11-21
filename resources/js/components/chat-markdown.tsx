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

        // Pisahkan jika ada emoji/bullet/variasi (seperti \uFE0F, ️) sebelum link [label](url) atau URL biasa
        text = text.replace(/([^\n])\s*(?:️|\uFE0F)?\s*(\[[^\]]+\]\([^\)]+\))/gi, '$1\n$2');
        text = text.replace(/([^\n])\s*(?:️|\uFE0F)?\s*(https?:\/\/[^\s\)\>\]]+)/gi, '$1\n$2');

        // Pisahkan jika ada kata kunci WHATSAPP / TELEGRAM / LINK ANTI NAWALA yang menempel di baris yang sama
        text = text.replace(/([^\n])\s+(WHATSAPP|TELEGRAM|LIVECHAT|LINK ANTI NAWALA|LINK ALTERNATIF|\( WAJIB|\(WAJIB)/gi, '$1\n\n$2');

        // Pastikan setiap baris teks diakhiri dua spasi (aturan standar Markdown agar selalu ganti baris <br>)
        return text
            .split('\n')
            .map((line) => {
                const trimmed = line.trim();
                if (!trimmed) return '';
                // Bersihkan karakter variasi emoji \uFE0F / bullet yang berdiri sendiri di awal baris
                const cleaned = trimmed.replace(/^[️\uFE0F\s]+/, '');
                return `${cleaned}  `;
            })
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
                    a: ({ href, children }) => {
                        let label = typeof children === 'string' ? children : String(children || '');
                        // Jika teks link berupa URL mentah panjang, buat labelnya jadi rapi dan enak dibaca
                        if (label.startsWith('http://') || label.startsWith('https://')) {
                            try {
                                const urlObj = new URL(label);
                                const path = urlObj.pathname.replace(/^\//, '');
                                if (label.toLowerCase().includes('wa') || label.toLowerCase().includes('whatsapp')) {
                                    label = 'WhatsApp CS Resmi';
                                } else if (label.toLowerCase().includes('tele') || label.toLowerCase().includes('t.me')) {
                                    label = 'Telegram CS Resmi';
                                } else if (path) {
                                    label = `Link Alternatif (${path})`;
                                } else {
                                    label = urlObj.hostname;
                                }
                            } catch (e) {
                                // fallback
                            }
                        }

                        return (
                            <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 font-bold text-xs text-amber-950 dark:text-amber-100 bg-amber-400/90 hover:bg-amber-300 dark:bg-amber-500 dark:hover:bg-amber-400 px-3 py-1.5 rounded-xl shadow-xs transition-transform active:scale-95 my-1 mr-1.5 no-underline cursor-pointer border border-amber-500/40"
                            >
                                <span>{label}</span>
                                <ExternalLink className="size-3.5 shrink-0 opacity-80" />
                            </a>
                        );
                    },
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
