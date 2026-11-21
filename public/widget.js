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
            z-index: 2147483645;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        #autochat-widget-btn {
            width: 58px;
            height: 58px;
            border-radius: 50%;
            background: #FFD200;
            color: #111827;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.18), 0 1px 3px rgba(0,0,0,0.1);
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
            width: 34px;
            height: 34px;
            object-fit: contain;
            border-radius: 6px;
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
                bottom: 0 !important;
                right: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                max-width: 100vw !important;
                max-height: 100vh !important;
                border-radius: 0 !important;
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
    btn.setAttribute('aria-label', 'Buka Chat Customer Support');
    btn.title = 'Livechat Customer Support';

    // Icons: Chat & Close
    var chatIcon = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
    `;

    var closeIcon = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
    `;

    btn.innerHTML = chatIcon;

    var isOpen = false;

    function toggleChat() {
        isOpen = !isOpen;

        if (isOpen) {
            if (!iframe) {
                iframe = document.createElement('iframe');
                iframe.id = 'autochat-widget-iframe';
                iframe.src = chatUrl;
                iframe.allow = 'clipboard-write';
                frameContainer.appendChild(iframe);
            }
            frameContainer.style.display = 'block';
            setTimeout(function () {
                frameContainer.classList.add('autochat-open');
            }, 10);
            btn.innerHTML = closeIcon;
        } else {
            frameContainer.classList.remove('autochat-open');
            btn.innerHTML = chatIcon;
            setTimeout(function () {
                if (!isOpen) {
                    frameContainer.style.display = 'none';
                }
            }, 250);
        }
    }

    btn.addEventListener('click', toggleChat);

    document.body.appendChild(frameContainer);
    root.appendChild(btn);
    document.body.appendChild(root);
})();
