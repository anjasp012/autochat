import React, { useState } from 'react';
import { Check, Code2, Copy, ExternalLink, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

interface Props {
    appId?: string;
    appName?: string;
}

export function WidgetScriptDialog({ appId = 'customer-support', appName = 'Chatbot' }: Props) {
    const [copied, setCopied] = useState(false);

    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000';
    const scriptCode = `<!-- AutoChat Widget - ${appName} -->
<script 
    src="${origin}/widget.js" 
    data-app="${appId}" 
    async>
</script>`;

    const handleCopy = () => {
        navigator.clipboard.writeText(scriptCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs font-semibold rounded-xl cursor-pointer shadow-2xs border-sidebar-border hover:bg-sidebar-accent"
                    title="Salin kode script widget untuk dipasang di website lain"
                >
                    <Code2 className="size-3.5 text-amber-500" />
                    <span>Script Widget</span>
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base font-bold">
                        <Smartphone className="size-5 text-amber-500" />
                        <span>Pasang Chatbot di Website Lain</span>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                        Tempelkan script di bawah ini sebelum tag{' '}
                        <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono text-foreground font-semibold">
                            &lt;/body&gt;
                        </code>{' '}
                        pada website, blog, atau landing page Anda. Widget akan tampil sebagai floating button interaktif di sudut kanan bawah.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-1">
                    {/* Code Snippet Box */}
                    <div className="relative rounded-2xl bg-neutral-950 p-4 border border-neutral-800 text-neutral-100 font-mono text-xs overflow-x-auto shadow-inner">
                        <pre className="text-emerald-400 select-all leading-relaxed whitespace-pre-wrap">
                            {scriptCode}
                        </pre>
                        <Button
                            size="sm"
                            onClick={handleCopy}
                            className={`absolute top-3 right-3 h-7 px-2.5 rounded-lg text-xs font-bold transition-all shadow-xs gap-1.5 cursor-pointer ${
                                copied
                                    ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
                                    : 'bg-amber-500 hover:bg-amber-600 text-neutral-950'
                            }`}
                        >
                            {copied ? (
                                <>
                                    <Check className="size-3" />
                                    <span>Tersalin!</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="size-3" />
                                    <span>Salin Kode</span>
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Fitur Widget Mobile / Floating */}
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-950 dark:text-amber-200 space-y-1.5">
                        <p className="font-bold flex items-center gap-1.5">
                            ✨ Keunggulan Widget Floating:
                        </p>
                        <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-neutral-700 dark:text-neutral-300">
                            <li>Otomatis memuat tampilan mobile / Android saat floating button diklik.</li>
                            <li>Realtime sinkronisasi dengan admin panel & notifikasi Reverb.</li>
                            <li>Bisa dipasang di platform manapun (WordPress, HTML biasa, Laravel, React, dll).</li>
                        </ul>
                    </div>

                    {/* Preview Button */}
                    <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-muted-foreground">
                            Target App: <strong className="text-foreground">{appId}</strong>
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="h-7 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                            <a
                                href={`${origin}/chat/${appId}?embed=1`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <span>Preview Tampilan Widget</span>
                                <ExternalLink className="size-3" />
                            </a>
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
