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
        DB::table('applications')
            ->where('model', 'like', '%llama%')
            ->orWhere('model', 'like', '%GGUF%')
            ->orWhere('model', 'like', '%gpt-oss%')
            ->orWhereNull('model')
            ->orWhere('model', '')
            ->update(['model' => 'qwen/qwen3.8-27b']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
