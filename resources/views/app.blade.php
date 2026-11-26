<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "system" }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: oklch(1 0 0);
            }

            html.dark {
                background-color: oklch(0.145 0 0);
            }
        </style>

        @php
            $customFavicon = null;
            if (isset($page['props']['application']['chat_settings'])) {
                $cs = $page['props']['application']['chat_settings'];
                $customFavicon = $cs['favicon_url'] ?? $cs['custom_icon_url'] ?? null;
            }
            $faviconVersion = file_exists(public_path('favicon.png')) ? filemtime(public_path('favicon.png')) : time();
        @endphp
        @if($customFavicon)
            <link rel="icon" href="{{ $customFavicon }}">
            <link rel="shortcut icon" href="{{ $customFavicon }}">
            <link rel="apple-touch-icon" href="{{ $customFavicon }}">
        @else
            <link rel="icon" href="/favicon.png?v={{ $faviconVersion }}" type="image/png">
            <link rel="shortcut icon" href="/favicon.ico?v={{ $faviconVersion }}">
            <link rel="apple-touch-icon" href="/apple-touch-icon.png?v={{ $faviconVersion }}">
        @endif

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            @if(isset($page['props']['application']['name']))
                <title>{{ $page['props']['application']['chat_settings']['header_title'] ?? $page['props']['application']['name'] }}</title>
            @else
                <title>{{ config('app.name', 'Laravel') }}</title>
            @endif
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
