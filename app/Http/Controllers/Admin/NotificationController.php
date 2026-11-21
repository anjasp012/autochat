<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BotEscalation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Get recent bot escalation notifications.
     */
    public function index(Request $request): JsonResponse
    {
        $notifications = BotEscalation::query()
            ->with(['application:id,app_id,name', 'conversation:id,uuid'])
            ->latest('id')
            ->limit(20)
            ->get()
            ->map(fn (BotEscalation $item) => [
                'id' => $item->id,
                'application_name' => $item->application?->name ?? 'Chatbot',
                'application_app_id' => $item->application?->app_id ?? '',
                'conversation_uuid' => $item->conversation?->uuid ?? '',
                'user_identifier' => $item->user_identifier ?? 'Pengunjung',
                'type' => $item->type,
                'title' => $item->title,
                'message' => $item->message,
                'is_read' => (bool) $item->is_read,
                'created_at' => $item->created_at?->diffForHumans() ?? 'Baru saja',
                'created_at_time' => $item->created_at?->format('H:i') ?? '',
            ]);

        $unreadCount = BotEscalation::where('is_read', false)->count();

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Mark a single escalation notification as read.
     */
    public function markAsRead(BotEscalation $escalation): JsonResponse
    {
        $escalation->update(['is_read' => true]);

        return response()->json([
            'success' => true,
            'unread_count' => BotEscalation::where('is_read', false)->count(),
        ]);
    }

    /**
     * Mark all escalation notifications as read.
     */
    public function markAllAsRead(): JsonResponse
    {
        BotEscalation::where('is_read', false)->update(['is_read' => true]);

        return response()->json([
            'success' => true,
            'unread_count' => 0,
        ]);
    }
}
