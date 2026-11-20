import { useState } from 'react';
import { Head } from '@inertiajs/react';
import { Bot, Send, Sparkles, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import PublicChatLayout from '@/layouts/public-chat-layout';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt?: string;
}

interface ApplicationData {
    id: number;
    app_id: string;
    name: string;
    description?: string | null;
    is_active: boolean;
}

interface Props {
    application?: ApplicationData;
    conversationId?: string;
}

export default function ChatShow({ application, conversationId }: Props) {
    const app = application || {
        id: 1,
        app_id: 'default-assistant',
        name: 'AI Chat Assistant',
        description: 'Tanyakan apa saja kepada asisten cerdas ini.',
        is_active: true,
    };

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleNewChat = () => {
        setMessages([]);
        setInput('');
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg: ChatMessage = {
            id: String(Date.now()),
            role: 'user',
            content: input.trim(),
            createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        // Simulation for layout testing
        setTimeout(() => {
            const aiMsg: ChatMessage = {
                id: String(Date.now() + 1),
                role: 'assistant',
                content: 'Halo! Saya adalah asisten AI Anda. Layout chat publik telah siap dan responsif.',
                createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages((prev) => [...prev, aiMsg]);
            setIsLoading(false);
        }, 800);
    };

    return (
        <PublicChatLayout
            appName={app.name}
            appDescription={app.description ?? undefined}
            isActive={app.is_active}
            onNewChat={handleNewChat}
        >
            <Head title={`Chat - ${app.name}`} />

            <div className="flex h-full flex-col">
                {/* Scrollable messages container */}
                <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                    <div className="mx-auto max-w-3xl space-y-6">
                        {messages.length === 0 ? (
                            <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
                                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                    <Sparkles className="size-7" />
                                </div>
                                <h2 className="mt-4 text-xl font-semibold tracking-tight">
                                    {app.name}
                                </h2>
                                <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
                                    {app.description || 'Mulai percakapan dengan mengetik pesan Anda di bawah ini.'}
                                </p>
                            </div>
                        ) : (
                            messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex items-start gap-3.5 ${
                                        message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                                    }`}
                                >
                                    <div
                                        className={`flex size-8 shrink-0 items-center justify-center rounded-xl text-xs font-medium shadow-xs ${
                                            message.role === 'user'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground border border-border'
                                        }`}
                                    >
                                        {message.role === 'user' ? (
                                            <UserIcon className="size-4" />
                                        ) : (
                                            <Bot className="size-4 text-primary" />
                                        )}
                                    </div>

                                    <div
                                        className={`group relative max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[75%] ${
                                            message.role === 'user'
                                                ? 'bg-primary text-primary-foreground rounded-br-xs'
                                                : 'bg-card text-card-foreground border border-border/80 shadow-xs rounded-bl-xs'
                                        }`}
                                    >
                                        <div className="whitespace-pre-wrap">{message.content}</div>
                                        {message.createdAt && (
                                            <div
                                                className={`mt-1 text-[10px] text-right ${
                                                    message.role === 'user'
                                                        ? 'text-primary-foreground/70'
                                                        : 'text-muted-foreground'
                                                }`}
                                            >
                                                {message.createdAt}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}

                        {isLoading && (
                            <div className="flex items-start gap-3.5">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted border border-border text-xs font-medium text-muted-foreground shadow-xs">
                                    <Bot className="size-4 text-primary" />
                                </div>
                                <div className="rounded-2xl rounded-bl-xs border border-border/80 bg-card px-4 py-3 shadow-xs">
                                    <div className="flex items-center gap-1.5">
                                        <span className="size-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.3s]" />
                                        <span className="size-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.15s]" />
                                        <span className="size-2 rounded-full bg-primary/60 animate-bounce" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Input Box */}
                <div className="border-t border-border/80 bg-background/95 p-4 backdrop-blur-md sm:px-6">
                    <form
                        onSubmit={handleSendMessage}
                        className="mx-auto flex max-w-3xl items-end gap-2"
                    >
                        <div className="relative flex-1">
                            <Textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage(e);
                                    }
                                }}
                                placeholder="Ketik pesan Anda di sini... (Shift + Enter untuk baris baru)"
                                rows={1}
                                className="min-h-[44px] max-h-32 resize-none rounded-xl py-3 pr-4 text-sm"
                            />
                        </div>
                        <Button
                            type="submit"
                            size="icon"
                            disabled={!input.trim() || isLoading}
                            className="size-11 shrink-0 rounded-xl cursor-pointer shadow-xs"
                        >
                            <Send className="size-4" />
                        </Button>
                    </form>
                    <div className="mt-2 text-center text-[11px] text-muted-foreground">
                        AI dapat membuat kekeliruan. Pastikan memverifikasi informasi penting.
                    </div>
                </div>
            </div>
        </PublicChatLayout>
    );
}
