(function () {
    'use strict';

    // Find current script tag to extract host and data attributes
    var currentScript =
        document.currentScript ||
        (function () {
            var scripts = document.getElementsByTagName('script');
            for (var i = scripts.length - 1; i >= 0; i--) {
                if (scripts[i].src && scripts[i].src.indexOf('widget.js') !== -1) {
                    return scripts[i];
                }
            }
            return scripts[scripts.length - 1];
        })();

    var scriptSrc = currentScript && currentScript.src ? currentScript.src : window.location.origin + '/widget.js';
    var urlObj = new URL(scriptSrc, window.location.href);
    var baseUrl = urlObj.origin;

    var appId = (currentScript && currentScript.getAttribute('data-app')) ||
        window.AutoChatAppId ||
        'customer-support';

    var chatUrl = baseUrl + '/chat/' + encodeURIComponent(appId) + '?embed=1';

    // Prevent duplicate injection
    if (document.getElementById('autochat-widget-root')) {
        return;
    }

    // Styles
    var style = document.createElement('style');
    style.id = 'autochat-widget-styles';
    style.innerHTML = `
        #autochat-widget-root {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 2147483647;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        #autochat-widget-btn {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            padding: 0;
            overflow: hidden;
            background: #ffffff;
            color: #111827;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2), 0 1px 4px rgba(0, 0, 0, 0.12);
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.25s ease;
            outline: none;
            -webkit-tap-highlight-color: transparent;
        }
        #autochat-widget-btn:hover {
            transform: scale(1.08);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.22);
        }
        #autochat-widget-btn:active {
            transform: scale(0.95);
        }
        #autochat-widget-btn img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 50%;
            display: block;
            pointer-events: none;
            transition: transform 0.2s ease;
        }
        #autochat-widget-btn svg {
            width: 24px;
            height: 24px;
            transition: transform 0.2s ease, opacity 0.2s ease;
        }
        #autochat-widget-frame-container {
            position: fixed;
            bottom: 94px;
            right: 24px;
            width: 380px;
            height: 600px;
            max-width: calc(100vw - 32px);
            max-height: calc(100vh - 110px);
            border-radius: 20px;
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25), 0 2px 6px rgba(0, 0, 0, 0.08);
            overflow: hidden;
            z-index: 2147483646;
            background: #ffffff;
            border: 1px solid rgba(0, 0, 0, 0.08);
            display: none;
            opacity: 0;
            transform: translateY(16px) scale(0.97);
            transform-origin: bottom right;
            transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        #autochat-widget-frame-container.autochat-open {
            display: block;
            opacity: 1;
            transform: translateY(0) scale(1);
        }
        #autochat-widget-iframe {
            width: 100%;
            height: 100%;
            border: none;
            display: block;
        }
        @media (max-width: 480px) {
            #autochat-widget-frame-container {
                bottom: 84px !important;
                right: 12px !important;
                width: calc(100vw - 24px) !important;
                height: min(560px, calc(100vh - 104px)) !important;
                height: min(560px, calc(100dvh - 104px)) !important;
                max-width: calc(100vw - 24px) !important;
                max-height: calc(100vh - 104px) !important;
                max-height: calc(100dvh - 104px) !important;
                border-radius: 18px !important;
            }
            #autochat-widget-root {
                bottom: 16px;
                right: 16px;
            }
        }
    `;
    document.head.appendChild(style);

    // Root wrapper
    var root = document.createElement('div');
    root.id = 'autochat-widget-root';

    // Frame container
    var frameContainer = document.createElement('div');
    frameContainer.id = 'autochat-widget-frame-container';

    var iframe = null;

    // Toggle button
    var btn = document.createElement('button');
    btn.id = 'autochat-widget-btn';
    btn.setAttribute('aria-label', 'Buka Chat AutoChat');
    btn.title = 'Livechat AutoChat';

    // Icons: AutoChat Mascot Logo & Close
    var iconUrl = baseUrl + '/images/autochat-widget-logo.png?v=20261128';
    var chatIcon = `
        <img src="${iconUrl}" alt="AutoChat" onerror="this.onerror=null;this.src='${baseUrl}/favicon.png';" />
    `;

    var closeIcon = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
    `;

    btn.innerHTML = chatIcon;

    var isOpen = false;
    var hasUserInteracted = false;

    function openChat() {
        if (isOpen) {
            return;
        }

        isOpen = true;

        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'autochat-widget-iframe';
            iframe.src = chatUrl;
            iframe.allow = 'clipboard-write';
            frameContainer.appendChild(iframe);
        }

        frameContainer.style.display = 'block';
        setTimeout(function () {
            if (isOpen) {
                frameContainer.classList.add('autochat-open');
            }
        }, 10);
        btn.innerHTML = closeIcon;
        btn.setAttribute('aria-label', 'Tutup Chat AutoChat');
    }

    function closeChat() {
        if (!isOpen) {
            return;
        }

        isOpen = false;
        frameContainer.classList.remove('autochat-open');
        btn.innerHTML = chatIcon;
        btn.setAttribute('aria-label', 'Buka Chat AutoChat');
        setTimeout(function () {
            if (!isOpen) {
                frameContainer.style.display = 'none';
            }
        }, 250);
    }

    function toggleChat() {
        hasUserInteracted = true;
        if (isOpen) {
            closeChat();
        } else {
            openChat();
        }
    }

    btn.addEventListener('click', toggleChat);

    function mountWidget() {
        if (document.getElementById('autochat-widget-root')) {
            return;
        }

        document.body.appendChild(frameContainer);
        root.appendChild(btn);
        document.body.appendChild(root);

        var autoOpenAttr = currentScript && currentScript.getAttribute('data-auto-open');
        var delayAttr = currentScript && currentScript.getAttribute('data-auto-open-delay');
        var parsedDelay = delayAttr !== null ? parseInt(delayAttr, 10) : 600;
        var autoOpenDelay = isNaN(parsedDelay) || parsedDelay < 0 ? 600 : parsedDelay;

        if (autoOpenAttr !== 'false') {
            setTimeout(function () {
                if (!hasUserInteracted && !isOpen) {
                    openChat();
                }
            }, autoOpenDelay);
        }
    }

    if (document.body) {
        mountWidget();
    } else {
        document.addEventListener('DOMContentLoaded', mountWidget, { once: true });
    }
})();
