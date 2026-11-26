<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BotEscalation;
use App\Models\Conversation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Get recent bot escalation notifications and total chat attention counts.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $notifications = BotEscalation::query()
            ->when(
                $user && ! $user->isSuperAdmin(),
                fn ($q) => $q->whereIn('application_id', $user->assigned_application_ids ?? [])
            )
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

        $counts = Conversation::countUnreadAttentionForUser($user);

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $counts['unread_escalations'],
            'chat_notifications' => $counts,
        ]);
    }

    /**
     * Mark a single escalation notification as read.
     */
    public function markAsRead(Request $request, BotEscalation $escalation): JsonResponse
    {
        $escalation->update(['is_read' => true]);
        $counts = Conversation::countUnreadAttentionForUser($request->user());

        return response()->json([
            'success' => true,
            'unread_count' => $counts['unread_escalations'],
            'chat_notifications' => $counts,
        ]);
    }

    /**
     * Mark all escalation notifications as read.
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $user = $request->user();
        BotEscalation::where('is_read', false)
            ->when(
                $user && ! $user->isSuperAdmin(),
                fn ($q) => $q->whereIn('application_id', $user->assigned_application_ids ?? [])
            )
            ->update(['is_read' => true]);

        $counts = Conversation::countUnreadAttentionForUser($user);

        return response()->json([
            'success' => true,
            'unread_count' => $counts['unread_escalations'],
            'chat_notifications' => $counts,
        ]);
    }
}
