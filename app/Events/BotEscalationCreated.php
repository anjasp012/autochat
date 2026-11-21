<?php

namespace App\Events;

use App\Models\BotEscalation;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class BotEscalationCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(public BotEscalation $escalation)
    {
        $this->escalation->loadMissing(['application', 'conversation']);
    }

    /**
     * Safely dispatch the event without breaking the request if Reverb server is offline.
     */
    public static function safeDispatch(BotEscalation $escalation): void
    {
        try {
            static::dispatch($escalation);
        } catch (\Throwable $e) {
            Log::warning('Broadcasting BotEscalationCreated skipped: '.$e->getMessage());
        }
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'BotEscalationCreated';
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('admin.notifications'),
            new Channel('conversations'),
        ];
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->escalation->id,
            'application_name' => $this->escalation->application?->name ?? 'Chatbot',
            'application_app_id' => $this->escalation->application?->app_id ?? '',
            'application_icon' => $this->escalation->application?->chat_settings['custom_icon_url'] ?? null,
            'conversation_uuid' => $this->escalation->conversation?->uuid ?? '',
            'user_identifier' => $this->escalation->user_identifier ?? 'Pengunjung',
            'type' => $this->escalation->type,
            'title' => $this->escalation->title,
            'message' => $this->escalation->message,
            'created_at' => $this->escalation->created_at?->diffForHumans() ?? 'Baru saja',
            'created_at_time' => $this->escalation->created_at?->format('H:i') ?? now()->format('H:i'),
            'unread_count' => BotEscalation::where('is_read', false)->count(),
        ];
    }
}
