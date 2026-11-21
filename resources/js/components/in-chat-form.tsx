import React, { useState } from 'react';
import { ClipboardList, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Props {
    type: string;
    headerColor: string;
    headerTextColor: string;
    defaultUsername?: string;
    onSubmit: (summaryText: string) => void;
    isSubmitted?: boolean;
}

export default function InChatForm({
    type,
    headerColor,
    headerTextColor,
    defaultUsername = '',
    onSubmit,
    isSubmitted = false,
}: Props) {
    const isWithdraw = type.includes('withdraw');
    const formTitle = isWithdraw ? 'Withdraw Status' : 'Deposit Status';

    const [username, setUsername] = useState(defaultUsername);
    const [tanggal, setTanggal] = useState('');
    const [hasSent, setHasSent] = useState(isSubmitted);
    const [error, setError] = useState<string | null>(null);

    // Buat daftar tanggal dropdown otomatis (Hari ini, Kemarin, dan 5 hari ke belakang)
    const dateOptions = React.useMemo(() => {
        const options: { label: string; value: string }[] = [];
        const now = new Date();

        for (let i = 0; i < 7; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);

            const dateStr = d.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
            });

            let prefix = '';
            if (i === 0) prefix = 'Hari ini - ';
            else if (i === 1) prefix = 'Kemarin - ';

            options.push({
                label: `${prefix}${dateStr}`,
                value: dateStr,
            });
        }
        return options;
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!username.trim()) {
            setError('Username wajib diisi.');
            return;
        }

        if (!tanggal || tanggal === 'Pilih...') {
            setError('Silakan pilih tanggal.');
            return;
        }

        const summary = `📋 **Formulir ${formTitle}:**\n• **Username:** ${username.trim()}\n• **Tanggal:** ${tanggal}`;
        setHasSent(true);
        onSubmit(summary);
    };

    return (
        <div className="w-full max-w-[280px] sm:max-w-[310px] rounded-xl border border-neutral-200/90 bg-white shadow-sm overflow-hidden my-1.5">
            {/* Header Form Berwarna Kustom (Lebih Kompak) */}
            <div
                className="px-3 py-2 flex items-center gap-2 font-bold text-xs shadow-2xs transition-colors"
                style={{ backgroundColor: headerColor, color: headerTextColor }}
            >
                <div className="flex size-5 items-center justify-center rounded bg-black/10 shrink-0">
                    <ClipboardList className="size-3.5" />
                </div>
                <span>{formTitle}</span>
            </div>

            {/* Isi Form */}
            <form onSubmit={handleSubmit} className="p-3 space-y-2.5 bg-white text-neutral-900">
                <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-700 block">
                        Username <span className="text-destructive font-bold">*</span>
                    </label>
                    <Input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Username anda"
                        disabled={hasSent}
                        className="h-8 text-xs rounded-lg bg-slate-50 border-neutral-200 text-neutral-900 font-medium placeholder:text-neutral-400 focus:bg-white px-2.5"
                        required
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-700 block">
                        Tanggal <span className="text-destructive font-bold">*</span>
                    </label>
                    <select
                        value={tanggal}
                        onChange={(e) => setTanggal(e.target.value)}
                        disabled={hasSent}
                        className="w-full h-8 px-2 text-xs rounded-lg bg-slate-50 border border-neutral-200 text-neutral-900 font-medium focus:outline-none focus:ring-1 focus:ring-amber-400 focus:bg-white cursor-pointer"
                        required
                    >
                        <option value="">Pilih...</option>
                        {dateOptions.map((opt, idx) => (
                            <option key={idx} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                {error && <p className="text-[10px] font-semibold text-destructive">{error}</p>}

                <div className="flex items-center justify-end pt-0.5">
                    {hasSent ? (
                        <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            <CheckCircle2 className="size-3.5" />
                            <span>Form Terkirim</span>
                        </div>
                    ) : (
                        <button
                            type="submit"
                            className="px-4 py-1.5 text-xs font-bold rounded-lg shadow-2xs transition-transform active:scale-95 cursor-pointer hover:opacity-90"
                            style={{ backgroundColor: headerColor, color: headerTextColor }}
                        >
                            Kirim
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
