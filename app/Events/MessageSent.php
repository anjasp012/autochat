<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(public Message $message)
    {
        $this->message->loadMissing('conversation');
    }

    /**
     * Safely dispatch the event without breaking the request if Reverb server is offline.
     */
    public static function safeDispatch(Message $message): void
    {
        try {
            static::dispatch($message);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Broadcasting MessageSent skipped: '.$e->getMessage());
        }
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('conversation.'.$this->message->conversation->uuid),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'MessageSent';
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
        ];
    }
}
