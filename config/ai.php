<?php

return [

    /*
    |--------------------------------------------------------------------------
    | LLM Server Base URL
    |--------------------------------------------------------------------------
    |
    | The base URL where the local llama.cpp server is running.
    |
    */

    'base_url' => env('LLM_BASE_URL', 'http://127.0.0.1:8080'),

    /*
    |--------------------------------------------------------------------------
    | LLM API Key
    |--------------------------------------------------------------------------
    |
    | Optional API key for authenticating with the llama.cpp server.
    |
    */

    'api_key' => env('LLM_API_KEY', null),

    /*
    |--------------------------------------------------------------------------
    | Default Model
    |--------------------------------------------------------------------------
    |
    | The default local model name loaded in llama.cpp.
    |
    */

    'model' => env('LLM_MODEL', 'Qwen3 1.7B Q4 GGUF'),

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
    | Thinking Mode
    |--------------------------------------------------------------------------
    |
    | Thinking mode setting ('disabled' by default for Qwen3 1.7B Q4 GGUF).
    |
    */

    'thinking_mode' => env('LLM_THINKING_MODE', 'disabled'),

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
