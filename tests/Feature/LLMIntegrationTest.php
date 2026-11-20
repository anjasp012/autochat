<?php

use App\Models\User;
use App\Services\AI\LLMService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->create([
        'is_admin' => true,
    ]);
});

test('llm service sends proper openai compatible payload and receives response', function () {
    Http::preventStrayRequests();

    Http::fake([
        'http://127.0.0.1:8080/v1/chat/completions' => Http::response([
            'id' => 'chatcmpl-test-123',
            'object' => 'chat.completion',
            'created' => time(),
            'model' => 'Qwen3 1.7B Q4 GGUF',
            'choices' => [
                [
                    'index' => 0,
                    'message' => [
                        'role' => 'assistant',
                        'content' => 'Halo! Ini adalah respon cerdas dari Qwen3.',
                    ],
                    'finish_reason' => 'stop',
                ],
            ],
            'usage' => [
                'prompt_tokens' => 25,
                'completion_tokens' => 15,
                'total_tokens' => 40,
            ],
        ], 200),
    ]);

    $service = new LLMService(
        baseUrl: 'http://127.0.0.1:8080',
        defaultModel: 'Qwen3 1.7B Q4 GGUF'
    );

    $response = $service->chat(
        messages: [
            ['role' => 'user', 'content' => 'Halo, siapa kamu?'],
        ],
        systemPrompt: 'Kamu adalah asisten profesional.',
        temperature: 0.70,
        maxTokens: 1024
    );

    expect($response->successful)->toBeTrue()
        ->and($response->content)->toBe('Halo! Ini adalah respon cerdas dari Qwen3.')
        ->and($response->promptTokens)->toBe(25)
        ->and($response->completionTokens)->toBe(15)
        ->and($response->totalTokens)->toBe(40);

    Http::assertSent(function (Request $request) {
        $data = $request->data();

        return $request->url() === 'http://127.0.0.1:8080/v1/chat/completions'
            && $data['model'] === 'Qwen3 1.7B Q4 GGUF'
            && $data['stream'] === false
            && $data['temperature'] === 0.70
            && $data['max_tokens'] === 1024
            && count($data['messages']) === 2
            && $data['messages'][0]['role'] === 'system'
            && $data['messages'][0]['content'] === 'Kamu adalah asisten profesional.'
            && $data['messages'][1]['role'] === 'user';
    });
});

test('llm service defaults to config values from environment', function () {
    Config::set('ai.base_url', 'http://10.0.0.1:8080');
    Config::set('ai.model', 'Qwen3 1.7B Q4 GGUF');
    Config::set('ai.session_timeout', 10);

    $service = new LLMService;

    expect($service->getBaseUrl())->toBe('http://10.0.0.1:8080')
        ->and($service->getDefaultModel())->toBe('Qwen3 1.7B Q4 GGUF')
        ->and(config('ai.session_timeout'))->toBe(10);
});

test('llm service handles connection failure gracefully', function () {
    Http::preventStrayRequests();

    Http::fake([
        'http://127.0.0.1:8080/v1/chat/completions' => Http::failedConnection(),
    ]);

    $service = new LLMService(baseUrl: 'http://127.0.0.1:8080');

    $response = $service->chat([
        ['role' => 'user', 'content' => 'Test query'],
    ]);

    expect($response->successful)->toBeFalse()
        ->and($response->error)->toContain('Tidak dapat terhubung ke AI server');
});

test('llm service handles 500 error from llama cpp gracefully', function () {
    Http::preventStrayRequests();

    Http::fake([
        'http://127.0.0.1:8080/v1/chat/completions' => Http::response([
            'error' => [
                'message' => 'CUDA out of memory error in llama.cpp',
            ],
        ], 500),
    ]);

    $service = new LLMService(baseUrl: 'http://127.0.0.1:8080');

    $response = $service->chat([
        ['role' => 'user', 'content' => 'Test query'],
    ]);

    expect($response->successful)->toBeFalse()
        ->and($response->error)->toContain('CUDA out of memory error');
});

test('llm service check health returns status online when endpoint is reachable', function () {
    Http::preventStrayRequests();

    Http::fake([
        'http://127.0.0.1:8080/v1/models' => Http::response([
            'data' => [
                ['id' => 'Qwen3 1.7B Q4 GGUF'],
            ],
        ], 200),
    ]);

    $service = new LLMService(baseUrl: 'http://127.0.0.1:8080');
    $health = $service->checkHealth();

    expect($health['status'])->toBe('online')
        ->and($health['url'])->toBe('http://127.0.0.1:8080');
});
