<?php

return [

    /*
    |--------------------------------------------------------------------------
    | LLM Server Base URL
    |--------------------------------------------------------------------------
    |
    | The base URL for the OpenAI-compatible AI provider (e.g. Groq, OpenAI).
    |
    */

    'base_url' => env('LLM_BASE_URL', 'https://api.groq.com/openai/v1'),

    /*
    |--------------------------------------------------------------------------
    | LLM API Key
    |--------------------------------------------------------------------------
    |
    | API key for authenticating with the cloud AI provider.
    |
    */

    'api_key' => env('LLM_API_KEY', null),

    /*
    |--------------------------------------------------------------------------
    | Default Model
    |--------------------------------------------------------------------------
    |
    | The default AI model to invoke for chat completions.
    |
    */

    'model' => env('LLM_MODEL', 'qwen/qwen3.8-27b'),

    /*
    |--------------------------------------------------------------------------
    | HTTP Timeouts
    |--------------------------------------------------------------------------
    |
    | Request and connection timeouts in seconds.
    |
    */

    'timeout' => (int) env('LLM_TIMEOUT', 60),

    'connect_timeout' => (int) env('LLM_CONNECT_TIMEOUT', 5),

    /*
    |--------------------------------------------------------------------------
    | Global Platform API Key
    |--------------------------------------------------------------------------
    |
    | Master key for backend API requests that require global authentication.
    |
    */

    'global_api_key' => env('AI_PLATFORM_API_KEY', 'autochat_secret_key_2026'),

    /*
    |--------------------------------------------------------------------------
    | Public Chat Session Timeout
    |--------------------------------------------------------------------------
    |
    | Number of minutes before an inactive public chat session expires (10 mins).
    |
    */

    'session_timeout' => (int) env('CHAT_SESSION_TIMEOUT_MINUTES', 10),

];
