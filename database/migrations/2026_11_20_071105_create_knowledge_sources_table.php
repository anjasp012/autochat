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
        Schema::create('knowledge_sources', function (Blueprint $table) {
            $table->id();
            $table->foreignId('application_id')->constrained('applications')->cascadeOnDelete();
            $table->text('url');
            $table->string('title')->nullable();
            $table->string('crawl_status', 30)->default('pending');
            $table->timestamp('last_crawled_at')->nullable();
            $table->text('error_message')->nullable();
            $table->unsignedInteger('total_chunks')->default(0);
            $table->timestamps();

            $table->index(['application_id', 'crawl_status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('knowledge_sources');
    }
};
