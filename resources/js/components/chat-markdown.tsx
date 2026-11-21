import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
    content: string;
    className?: string;
}

export default function ChatMarkdown({ content, className = '' }: Props) {
    // Normalisasi line break: setiap baris baru (enter) dari admin atau user
    // tetap turun satu baris tanpa merusak sintaks teks.
    const formattedContent = React.useMemo(() => {
        if (!content) return '';
        const text = content.replace(/\r\n/g, '\n').replace(/\uFE0F/g, '');

        // Tambahkan 2 spasi di akhir setiap baris agar Markdown menjadikannya <br />
        return text
            .split('\n')
            .map((line) => `${line.trimEnd()}  `)
            .join('\n');
    }, [content]);

    return (
        <div className={`prose prose-sm dark:prose-invert max-w-none text-inherit leading-relaxed ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                    h1: ({ children }) => <h1 className="text-base font-bold my-2">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-sm font-bold my-2">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-xs font-bold my-1.5">{children}</h3>,
                    ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                    li: ({ children }) => <li>{children}</li>,
                    strong: ({ children }) => <strong className="font-bold text-inherit">{children}</strong>,
                    // Link teks biasa, tanpa bentuk tombol
                    a: ({ href, children }) => (
                        <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-600 dark:text-amber-400 hover:underline font-semibold break-all"
                        >
                            {children}
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
