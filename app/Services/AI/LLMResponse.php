<?php

namespace App\Services\AI;

class LLMResponse
{
    /**
     * @param  array<string, mixed>  $raw
     */
    public function __construct(
        public bool $successful,
        public string $content,
        public int $promptTokens = 0,
        public int $completionTokens = 0,
        public int $totalTokens = 0,
        public ?string $error = null,
        public array $raw = []
    ) {}

    /**
     * Create a successful response instance.
     *
     * @param  array<string, mixed>  $raw
     */
    public static function success(
        string $content,
        int $promptTokens = 0,
        int $completionTokens = 0,
        int $totalTokens = 0,
        array $raw = []
    ): self {
        return new self(
            successful: true,
            content: $content,
            promptTokens: $promptTokens,
            completionTokens: $completionTokens,
            totalTokens: $totalTokens,
            error: null,
            raw: $raw
        );
    }

    /**
     * Create a failed response instance.
     *
     * @param  array<string, mixed>  $raw
     */
    public static function failure(string $errorMessage, array $raw = []): self
    {
        return new self(
            successful: false,
            content: '',
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            error: $errorMessage,
            raw: $raw
        );
    }
}
