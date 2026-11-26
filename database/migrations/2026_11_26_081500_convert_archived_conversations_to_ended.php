<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('conversations')
            ->where('is_archived', true)
            ->whereNull('ended_reason')
            ->update([
                'ended_reason' => 'admin',
                'ended_at' => now(),
                'is_archived' => false,
                'is_waiting_admin' => false,
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
