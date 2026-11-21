<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class MessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(public Message $message)
    {
        $this->message->loadMissing(['conversation.application']);
    }

    /**
     * Safely dispatch the event without breaking the request if Reverb server is offline.
     */
    public static function safeDispatch(Message $message): void
    {
        try {
            static::dispatch($message);
        } catch (\Throwable $e) {
            Log::warning('Broadcasting MessageSent skipped: '.$e->getMessage());
        }
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'MessageSent';
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        $channels = [
            new Channel('conversation.'.$this->message->conversation->uuid),
            new Channel('conversations'),
        ];

        if ($this->message->conversation->application) {
            $channels[] = new Channel('conversations.'.$this->message->conversation->application->app_id);
        }

        return $channels;
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->message->id,
            'role' => $this->message->role,
            'content' => $this->message->content,
            'created_at' => $this->message->created_at?->format('H:i') ?? now()->format('H:i'),
            'conversation_uuid' => $this->message->conversation->uuid,
            'application_app_id' => $this->message->conversation->application?->app_id,
            'is_taken_over' => (bool) $this->message->conversation->is_taken_over,
            'is_waiting_admin' => (bool) $this->message->conversation->is_waiting_admin,
            'taken_over_by' => $this->message->conversation->taken_over_by,
            'is_archived' => (bool) $this->message->conversation->is_archived,
        ];
    }
}
