<?php

namespace App\Services\AI;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class LLMService
{
    protected string $baseUrl;

    protected ?string $apiKey;

    protected string $defaultModel;

    protected int $timeout;

    protected int $connectTimeout;

    public function __construct(
        ?string $baseUrl = null,
        ?string $apiKey = null,
        ?string $defaultModel = null,
        ?int $timeout = null,
        ?int $connectTimeout = null
    ) {
        $url = rtrim(
            $baseUrl ?? config('ai.base_url', 'http://127.0.0.1:8080'),
            '/'
        );

        // Strip trailing /v1 if present so /v1/chat/completions does not become /v1/v1/...
        if (str_ends_with($url, '/v1')) {
            $url = substr($url, 0, -3);
        }

        $this->baseUrl = $url;

        $this->apiKey = $apiKey ?? config('ai.api_key');

        $this->defaultModel = $defaultModel ?? config('ai.model', 'Qwen3 1.7B Q4 GGUF');

        $this->timeout = $timeout ?? (int) config('ai.timeout', 60);

        $this->connectTimeout = $connectTimeout ?? (int) config('ai.connect_timeout', 5);
    }

    /**
     * Send chat completion request to the local llama.cpp server.
     *
     * @param  array<int, array{role: string, content: string}>  $messages
     */
    public function chat(
        array $messages,
        ?string $systemPrompt = null,
        ?string $model = null,
        ?float $temperature = null,
        ?int $maxTokens = null
    ): LLMResponse {
        $formattedMessages = [];

        // Prepend system prompt if supplied
        if (! empty($systemPrompt)) {
            $formattedMessages[] = [
                'role' => 'system',
                'content' => $systemPrompt,
            ];
        }

        // Add user/assistant messages
        foreach ($messages as $msg) {
            if (isset($msg['role'], $msg['content'])) {
                $formattedMessages[] = [
                    'role' => (string) $msg['role'],
                    'content' => (string) $msg['content'],
                ];
            }
        }

        // If passed model is empty or obsolete local GGUF string, fallback to defaultModel
        $effectiveModel = (! empty($model) && ! str_contains($model, 'GGUF'))
            ? $model
            : $this->defaultModel;

        $payload = [
            'model' => $effectiveModel,
            'messages' => $formattedMessages,
            'temperature' => $temperature ?? 0.70,
            'max_tokens' => $maxTokens ?? 2048,
            'stream' => false,
        ];

        try {
            $response = $this->client()
                ->post('/v1/chat/completions', $payload);

            if (! $response->successful()) {
                $errorMessage = $response->json('error.message')
                    ?? $response->json('message')
                    ?? "AI Server mengembalikan status code {$response->status()}";

                Log::warning('LLMService request unsuccessful', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return LLMResponse::failure($errorMessage, $response->json() ?? []);
            }

            $data = $response->json();
            $content = $data['choices'][0]['message']['content'] ?? null;

            if ($content === null) {
                Log::error('LLMService returned response without choices content', ['response' => $data]);

                return LLMResponse::failure('Format respon AI tidak sesuai (konten pesan kosong).', $data ?? []);
            }

            $usage = $data['usage'] ?? [];
            $promptTokens = (int) ($usage['prompt_tokens'] ?? 0);
            $completionTokens = (int) ($usage['completion_tokens'] ?? 0);
            $totalTokens = (int) ($usage['total_tokens'] ?? ($promptTokens + $completionTokens));

            return LLMResponse::success(
                content: trim($content),
                promptTokens: $promptTokens,
                completionTokens: $completionTokens,
                totalTokens: $totalTokens,
                raw: $data
            );
        } catch (ConnectionException $e) {
            Log::error('LLMService connection failed', [
                'url' => "{$this->baseUrl}/v1/chat/completions",
                'error' => $e->getMessage(),
            ]);

            return LLMResponse::failure(
                "Tidak dapat terhubung ke AI server ({$this->baseUrl}). Pastikan llama.cpp sedang berjalan di port yang sesuai."
            );
        } catch (RequestException $e) {
            Log::error('LLMService request exception', ['error' => $e->getMessage()]);

            return LLMResponse::failure('Terjadi kesalahan saat memproses permintaan ke model AI: '.$e->getMessage());
        } catch (Throwable $e) {
            Log::error('LLMService unexpected error', ['exception' => $e]);

            return LLMResponse::failure('Terjadi kegagalan sistem AI: '.$e->getMessage());
        }
    }

    /**
     * Check if the llama.cpp server is reachable.
     *
     * @return array{status: string, url: string, latency_ms?: float, error?: string}
     */
    public function checkHealth(): array
    {
        $start = microtime(true);

        try {
            $response = $this->client()
                ->timeout(4)
                ->connectTimeout(2)
                ->get('/v1/models');

            $latency = round((microtime(true) - $start) * 1000, 2);

            if ($response->successful()) {
                return [
                    'status' => 'online',
                    'url' => $this->baseUrl,
                    'latency_ms' => $latency,
                    'models' => $response->json('data') ?? [],
                ];
            }

            return [
                'status' => 'offline',
                'url' => $this->baseUrl,
                'latency_ms' => $latency,
                'error' => "HTTP {$response->status()}: {$response->body()}",
            ];
        } catch (Throwable $e) {
            return [
                'status' => 'offline',
                'url' => $this->baseUrl,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Build the HTTP client with appropriate headers and timeouts.
     */
    protected function client(): PendingRequest
    {
        $client = Http::baseUrl($this->baseUrl)
            ->connectTimeout($this->connectTimeout)
            ->timeout($this->timeout)
            ->acceptJson()
            ->asJson();

        if (! empty($this->apiKey)) {
            $client = $client->withToken($this->apiKey);
        }

        return $client;
    }

    /**
     * Get current configured base URL.
     */
    public function getBaseUrl(): string
    {
        return $this->baseUrl;
    }

    /**
     * Get default model.
     */
    public function getDefaultModel(): string
    {
        return $this->defaultModel;
    }
}
