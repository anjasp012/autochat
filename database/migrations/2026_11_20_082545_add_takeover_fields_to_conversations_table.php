<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->boolean('is_taken_over')->default(false)->after('last_activity_at')->index();
            $table->timestamp('taken_over_at')->nullable()->after('is_taken_over');
            $table->foreignId('taken_over_by')->nullable()->after('taken_over_at')->constrained('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropForeign(['taken_over_by']);
            $table->dropColumn(['is_taken_over', 'taken_over_at', 'taken_over_by']);
        });
    }
};
