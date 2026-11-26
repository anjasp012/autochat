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
            $table->string('ended_reason', 20)->nullable()->after('is_archived')->index();
            $table->timestamp('ended_at')->nullable()->after('ended_reason')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropIndex(['ended_reason']);
            $table->dropIndex(['ended_at']);
            $table->dropColumn(['ended_reason', 'ended_at']);
        });
    }
};
