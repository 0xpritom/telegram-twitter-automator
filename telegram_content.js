let isRunning = false;
let selectionState = 'IDLE'; // IDLE, SELECTING_START, SELECTING_END
let linksToProcess = [];
let collectedUrls = new Set();
let ignoredUrls = new Set();
let scanInterval = null;
let currentIndex = 0;
let hoveredNode = null;

function createStatusUI() {
    if (document.getElementById('telegram-bot-status')) return;
    
    const statusBox = document.createElement('div');
    statusBox.id = 'telegram-bot-status';
    statusBox.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 24px;
        background: rgba(255, 255, 255, 0.90);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(59, 130, 246, 0.3);
        border-radius: 12px;
        padding: 16px;
        color: #1e293b;
        z-index: 999999;
        font-family: 'Inter', system-ui, sans-serif;
        box-shadow: 0 0 25px rgba(59, 130, 246, 0.35), 0 0 10px rgba(139, 92, 246, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.8);
        min-width: 220px;
        max-width: 250px;
        transition: all 0.3s ease;
    `;
    
    const titleContainer = document.createElement('div');
    titleContainer.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    `;
    
    const logo = document.createElement('div');
    logo.innerHTML = '🤖';
    logo.style.cssText = `
        font-size: 1.3rem;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
    `;
    
    const title = document.createElement('div');
    title.innerHTML = '<b>Telegram-X Automator</b>';
    title.style.cssText = `
        font-size: 0.95rem;
        font-weight: 700;
        letter-spacing: 0.3px;
        color: #0f172a;
    `;
    
    titleContainer.appendChild(logo);
    titleContainer.appendChild(title);
    
    const scanBtn = document.createElement('button');
    scanBtn.id = 'telegram-bot-scan-btn';
    scanBtn.innerText = 'Select Start & End';
    scanBtn.style.cssText = `
        background: linear-gradient(135deg, #f59e0b, #ea580c);
        color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; width: 100%;
        font-weight: 600; font-size: 0.85rem; margin-bottom: 8px; transition: all 0.2s ease;
        box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
    `;
    
    const runBtn = document.createElement('button');
    runBtn.id = 'telegram-bot-run-btn';
    runBtn.innerText = 'Process 0 Links';
    runBtn.disabled = true;
    runBtn.style.cssText = `
        background: rgba(0, 0, 0, 0.04); color: #94a3b8; border: 1px solid rgba(0, 0, 0, 0.05); 
        padding: 8px 12px; border-radius: 6px; cursor: not-allowed; width: 100%;
        font-weight: 600; font-size: 0.85rem; margin-bottom: 8px; transition: all 0.2s ease;
    `;
    
    const clearBtn = document.createElement('button');
    clearBtn.id = 'telegram-bot-clear-btn';
    clearBtn.innerText = 'Clear Links';
    clearBtn.disabled = true;
    clearBtn.style.cssText = `
        background: rgba(0, 0, 0, 0.04); color: #94a3b8; border: 1px solid rgba(0, 0, 0, 0.05); 
        padding: 8px 12px; border-radius: 6px; cursor: not-allowed; width: 100%;
        font-weight: 600; font-size: 0.85rem; margin-bottom: 16px; transition: all 0.2s ease;
    `;
    
    const statusContainer = document.createElement('div');
    statusContainer.style.cssText = `
        background: rgba(0, 0, 0, 0.03);
        border-radius: 6px;
        padding: 12px;
        border: 1px solid rgba(0, 0, 0, 0.04);
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
    `;
    
    const text = document.createElement('div');
    text.id = 'telegram-bot-text';
    text.innerHTML = '<span style="color: #64748b; font-weight: 600; font-size: 0.75rem; text-transform: uppercase;">Status</span><br/><div style="margin-top: 4px; color: #475569;">Ready. Click "Select Start & End".</div>';
    text.style.cssText = `
        font-size: 0.8rem;
        line-height: 1.5;
        word-break: break-word;
    `;
    
    scanBtn.onclick = toggleScanning;
    runBtn.onclick = startProcessing;
    clearBtn.onclick = clearLinks;
    
    statusContainer.appendChild(text);
    
    statusBox.appendChild(titleContainer);
    statusBox.appendChild(scanBtn);
    statusBox.appendChild(runBtn);
    statusBox.appendChild(clearBtn);
    statusBox.appendChild(statusContainer);
    
    document.body.appendChild(statusBox);
    
    document.addEventListener('click', handleGlobalClick, true);
    document.addEventListener('mousemove', handleHover, true);
}

function updateStatus(message) {
    const textEl = document.getElementById('telegram-bot-text');
    if (textEl) {
        textEl.innerHTML = `<span style="color: #64748b; font-size: 0.75rem; text-transform: uppercase; font-weight: 600;">Status</span><br/><div style="margin-top: 4px; color: #475569;">${message.replace(/\n/g, '<br/>')}</div>`;
    }
}

function enableButton(id, colorType) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.disabled = false;
    btn.style.border = 'none';
    btn.style.color = 'white';
    btn.style.cursor = 'pointer';
    
    if (colorType === 'blue') {
        btn.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
        btn.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
    } else if (colorType === 'green') {
        btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        btn.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
    } else if (colorType === 'orange') {
        btn.style.background = 'linear-gradient(135deg, #f59e0b, #ea580c)';
        btn.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)';
    } else if (colorType === 'red') {
        btn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        btn.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
    }
}

function disableButton(id) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.disabled = true;
    btn.style.background = 'rgba(0, 0, 0, 0.04)';
    btn.style.border = '1px solid rgba(0, 0, 0, 0.05)';
    btn.style.color = '#94a3b8';
    btn.style.cursor = 'not-allowed';
    btn.style.boxShadow = 'none';
}

function normalizeTwitterUrl(url) {
    try {
        if (!url.startsWith('http')) url = 'https://' + url;
        let urlObj = new URL(url);
        
        let host = urlObj.hostname.toLowerCase();
        if (host === 'x.com' || host === 'www.x.com' || host === 'www.twitter.com') {
            host = 'twitter.com';
        }
        
        // IMPORTANT: For /intent/ links (like/retweet/reply), the query parameter (?tweet_id=...) 
        // is the ONLY thing that makes the URL unique. We MUST NOT strip it.
        // For normal status links, we can strip the tracking parameters.
        if (!urlObj.pathname.includes('/intent/')) {
            urlObj.search = '';
        }
        
        return 'https://' + host + urlObj.pathname + urlObj.search;
    } catch (e) {
        return url;
    }
}

function handleHover(e) {
    if (selectionState === 'IDLE') {
        if (hoveredNode) {
            removeHoverOutline(hoveredNode);
            hoveredNode = null;
        }
        return;
    }
    
    let target = e.target;
    if (target.id === 'telegram-bot-status' || target.closest('#telegram-bot-status')) return;
    
    let msgNode = target.closest('.message, .Message, .message-list-item, .im_message_wrap, .bubble, [data-message-id], [data-msg-id]');
    if (!msgNode) msgNode = target;
    
    if (msgNode && msgNode !== hoveredNode) {
        if (hoveredNode) {
            removeHoverOutline(hoveredNode);
        }
        
        let color = selectionState === 'SELECTING_START' ? '#10b981' : '#ef4444';
        
        if (!msgNode.classList.contains('telegram-bot-boundary-start') && !msgNode.classList.contains('telegram-bot-boundary-end')) {
            msgNode.style.outline = `2px dashed ${color}`;
            msgNode.style.outlineOffset = '-2px';
        }
        
        hoveredNode = msgNode;
    }
}

function removeHoverOutline(node) {
    if (!node) return;
    if (node.classList.contains('telegram-bot-boundary-start')) {
        node.style.outline = '3px solid #10b981';
        node.style.outlineOffset = '-3px';
    } else if (node.classList.contains('telegram-bot-boundary-end')) {
        node.style.outline = '3px solid #ef4444';
        node.style.outlineOffset = '-3px';
    } else {
        node.style.outline = '';
    }
}

function highlightTarget(node, type) {
    if (!node) return;
    let color = type === 'start' ? '#10b981' : '#ef4444';
    node.style.outline = `3px solid ${color}`;
    node.style.outlineOffset = '-3px';
    node.classList.add(`telegram-bot-boundary-${type}`);
}

function removeScannerLine() {
    document.querySelectorAll('.telegram-bot-boundary-start, .telegram-bot-boundary-end').forEach(el => {
        el.style.outline = '';
        el.classList.remove('telegram-bot-boundary-start');
        el.classList.remove('telegram-bot-boundary-end');
    });
    if (hoveredNode) {
        removeHoverOutline(hoveredNode);
        hoveredNode = null;
    }
}

function toggleScanning() {
    if (isRunning) return;
    const scanBtn = document.getElementById('telegram-bot-scan-btn');
    
    if (selectionState === 'IDLE') {
        selectionState = 'SELECTING_START';
        scanBtn.innerText = 'Cancel Selection';
        enableButton('telegram-bot-scan-btn', 'red');
        
        disableButton('telegram-bot-run-btn');
        disableButton('telegram-bot-clear-btn');
        updateStatus("Click near the START message.");
        document.body.style.cursor = 'crosshair';
        
    } else if (selectionState === 'SELECTING_START' || selectionState === 'SELECTING_END') {
        selectionState = 'IDLE';
        if (scanInterval) clearInterval(scanInterval);
        removeScannerLine();
        
        scanBtn.innerText = 'Select Start & End';
        enableButton('telegram-bot-scan-btn', 'orange');
        updateStatus("Selection cancelled.");
        document.body.style.cursor = 'default';
        
        if (linksToProcess.length > 0) {
            enableButton('telegram-bot-run-btn', 'blue');
            enableButton('telegram-bot-clear-btn', 'orange');
        }
    }
}

function handleGlobalClick(e) {
    if (selectionState === 'IDLE') return;
    if (e.target.closest('#telegram-bot-status')) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    let clickY = e.clientY;
    let target = e.target;
    
    let msgNode = target.closest('.message, .Message, .message-list-item, .im_message_wrap, .bubble, [data-message-id], [data-msg-id]');
    if (!msgNode) msgNode = target;
    
    if (selectionState === 'SELECTING_START') {
        collectedUrls.clear();
        ignoredUrls.clear();
        removeScannerLine();
        
        highlightTarget(msgNode, 'start');
        
        // Pure Geometry approach: Ignore all links that are physically ABOVE the top of the start message
        let msgRect = msgNode.getBoundingClientRect();
        let topBoundary = msgRect.top;
        
        let currentLinks = getAllXLinksRaw();
        currentLinks.forEach(item => {
            let rect = item.node.getBoundingClientRect();
            // If the link is entirely above the start message's top boundary
            if (rect.bottom <= topBoundary) {
                ignoredUrls.add(normalizeTwitterUrl(item.url));
            }
        });
        
        selectionState = 'SELECTING_END';
        updateStatus(`Start selected!\nScroll down and click ON the END message.`);
        
        scanInterval = setInterval(scanForLinks, 200);
        
    } else if (selectionState === 'SELECTING_END') {
        clearInterval(scanInterval);
        
        highlightTarget(msgNode, 'end');
        
        // Pure Geometry approach: Ignore all links that are physically BELOW the bottom of the end message
        let msgRect = msgNode.getBoundingClientRect();
        let bottomBoundary = msgRect.bottom;
        
        let currentLinks = getAllXLinksRaw();
        currentLinks.forEach(item => {
            let rect = item.node.getBoundingClientRect();
            let normalized = normalizeTwitterUrl(item.url);
            
            // If the link is entirely below the end message's bottom boundary
            if (rect.top >= bottomBoundary) {
                ignoredUrls.add(normalized);
                collectedUrls.delete(normalized);
            }
        });
        
        // Final pass
        currentLinks.forEach(item => {
            let normalized = normalizeTwitterUrl(item.url);
            if (!ignoredUrls.has(normalized)) {
                collectedUrls.add(normalized);
            }
        });
        
        document.body.style.cursor = 'default';
        selectionState = 'IDLE';
        if (hoveredNode) {
            removeHoverOutline(hoveredNode);
            hoveredNode = null;
        }
        
        const scanBtn = document.getElementById('telegram-bot-scan-btn');
        scanBtn.innerText = 'Start New Selection';
        enableButton('telegram-bot-scan-btn', 'orange');
        
        linksToProcess = Array.from(collectedUrls);
        
        if (linksToProcess.length > 0) {
            enableButton('telegram-bot-run-btn', 'blue');
            const runBtn = document.getElementById('telegram-bot-run-btn');
            runBtn.innerText = `Process ${linksToProcess.length} Links`;
            enableButton('telegram-bot-clear-btn', 'orange');
            updateStatus(`Success! Found ${linksToProcess.length} valid links.`);
        } else {
            updateStatus(`No links found in the selected range.`);
            enableButton('telegram-bot-clear-btn', 'orange');
        }
    }
}

function clearLinks() {
    if (isRunning) return;
    linksToProcess = [];
    collectedUrls.clear();
    ignoredUrls.clear();
    
    const runBtn = document.getElementById('telegram-bot-run-btn');
    runBtn.innerText = 'Process 0 Links';
    disableButton('telegram-bot-run-btn');
    disableButton('telegram-bot-clear-btn');
    removeScannerLine();
    
    selectionState = 'IDLE';
    if (scanInterval) clearInterval(scanInterval);
    document.body.style.cursor = 'default';
    
    const scanBtn = document.getElementById('telegram-bot-scan-btn');
    scanBtn.innerText = 'Select Start & End';
    enableButton('telegram-bot-scan-btn', 'orange');
    
    updateStatus("Links cleared. Ready to start over.");
}

function scanForLinks() {
    const currentLinks = getAllXLinksRaw();
    
    currentLinks.forEach(linkItem => {
        let normalized = normalizeTwitterUrl(linkItem.url);
        if (!ignoredUrls.has(normalized)) {
            collectedUrls.add(normalized);
        }
    });
    
    if (collectedUrls.size > 0) {
        updateStatus(`Scanning... Found ${collectedUrls.size} unique links.\nScroll down and click END.`);
    }
}

function getAllXLinksRaw() {
    const result = [];
    const urlRegex = /(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)(?:\/[^\s<>"']*)?/gi;
    
    const aTags = Array.from(document.querySelectorAll('a'));
    aTags.forEach(a => {
        // Only process links inside actual message containers to avoid sidebar links
        if (!a.closest('.message, .Message, .message-list-item, .im_message_wrap, .bubble, [data-message-id], [data-msg-id]')) {
            return;
        }
        
        let href = a.href || '';
        let text = a.textContent || '';
        
        if (href.toLowerCase().includes('x.com') || href.toLowerCase().includes('twitter.com') ||
            text.toLowerCase().includes('x.com') || text.toLowerCase().includes('twitter.com')) {
            let finalUrl = href;
            if (!href.toLowerCase().includes('x.com') && !href.toLowerCase().includes('twitter.com')) {
                const match = text.match(/(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)(?:\/[^\s<>"']*)?/i);
                if (match) {
                    finalUrl = match[0].replace(/[.,;!?)]+$/, '');
                }
            }
            if (finalUrl) {
                if (!finalUrl.startsWith('http')) finalUrl = 'https://' + finalUrl;
                result.push({ url: finalUrl, node: a });
            }
        }
    });

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
        if (!node.parentElement) continue;
        if (node.parentElement.closest('a')) continue;
        if (node.parentElement.tagName === 'SCRIPT' || node.parentElement.tagName === 'STYLE') continue;
        // Only process text nodes inside actual message containers
        if (!node.parentElement.closest('.message, .Message, .message-list-item, .im_message_wrap, .bubble, [data-message-id], [data-msg-id]')) continue;
        
        const text = node.nodeValue;
        if (text && (text.toLowerCase().includes('x.com') || text.toLowerCase().includes('twitter.com'))) {
            let match;
            urlRegex.lastIndex = 0;
            while ((match = urlRegex.exec(text)) !== null) {
                let url = match[0].replace(/[.,;!?)]+$/, '');
                if (!url.startsWith('http')) url = 'https://' + url;
                result.push({ url: url, node: node.parentElement });
            }
        }
    }
    
    return result;
}

async function startProcessing() {
    if (isRunning || linksToProcess.length === 0) return;
    isRunning = true;
    
    disableButton('telegram-bot-scan-btn');
    disableButton('telegram-bot-run-btn');
    disableButton('telegram-bot-clear-btn');
    
    currentIndex = 0;
    updateStatus(`Starting process... (0/${linksToProcess.length})`);
    processNextLink();
}

function processNextLink() {
    if (currentIndex >= linksToProcess.length) {
        updateStatus("<span style='color:#059669; font-weight:600;'>All links processed successfully!</span>");
        isRunning = false;
        
        const scanBtn = document.getElementById('telegram-bot-scan-btn');
        scanBtn.innerText = 'Start New Selection';
        enableButton('telegram-bot-scan-btn', 'orange');
        enableButton('telegram-bot-clear-btn', 'orange');
        return;
    }
    
    const url = linksToProcess[currentIndex];
    let displayUrl = url;
    if (displayUrl.length > 35) displayUrl = displayUrl.substring(0, 32) + '...';
    
    updateStatus(`Opening <b style="color:#2563eb">${currentIndex + 1}/${linksToProcess.length}</b>:\n<span style="color:#64748b; font-size: 0.75rem">${displayUrl}</span>`);
    
    chrome.runtime.sendMessage({ action: 'open_twitter_link', url: url }, (response) => {
        if (chrome.runtime.lastError) {
            updateStatus(`<span style="color:#dc2626; font-weight:600;">Error: ${chrome.runtime.lastError.message}</span>`);
            isRunning = false;
        }
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'next_link') {
        const processedUrl = linksToProcess[currentIndex];
        if (processedUrl) reactToMessage(processedUrl);
        
        currentIndex++;
        chrome.storage.local.get(['timeLimit'], (res) => {
            const delayInSeconds = (res.timeLimit !== undefined) ? parseInt(res.timeLimit, 10) : 0;
            if (delayInSeconds > 0 && currentIndex < linksToProcess.length) {
                updateStatus(`Waiting ${delayInSeconds}s before next link...`);
                setTimeout(() => processNextLink(), delayInSeconds * 1000);
            } else {
                setTimeout(() => processNextLink(), 1000);
            }
        });
        sendResponse({ success: true });
    }
});

function reactToMessage(url) {
    try {
        const aTags = Array.from(document.querySelectorAll('a'));
        let targetA = null;
        
        let normalizedTarget = normalizeTwitterUrl(url);
        
        for (let a of aTags) {
            let href = a.href || '';
            let text = a.textContent || '';
            
            let normalizedHref = normalizeTwitterUrl(href);
            if (normalizedHref === normalizedTarget || text.includes(url)) {
                targetA = a;
                break;
            }
        }
        
        if (targetA) {
            let container = targetA.closest('.message, .Message, .bubble, .message-list-item');
            if (!container) container = targetA.parentElement; 
            
            if (container) {
                const dblClickEvent = new MouseEvent('dblclick', {
                    bubbles: true, cancelable: true, view: window
                });
                container.dispatchEvent(dblClickEvent);
                
                targetA.style.border = "2px solid #10b981";
                targetA.style.borderRadius = "4px";
                targetA.style.padding = "2px";
                targetA.style.backgroundColor = "rgba(16, 185, 129, 0.2)";
                
                if (!targetA.querySelector('.bot-check-mark')) {
                    const check = document.createElement('span');
                    check.className = 'bot-check-mark';
                    check.innerText = ' ✅';
                    targetA.appendChild(check);
                }
            }
        }
    } catch(e) {
        console.error("[Telegram-Bot] Error reacting to message:", e);
    }
}

chrome.storage.local.get(['enabled'], (res) => {
    if (res.enabled) createStatusUI();
});

chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled !== undefined) {
        if (changes.enabled.newValue) {
            createStatusUI();
        } else {
            const el = document.getElementById('telegram-bot-status');
            if (el) el.remove();
            isRunning = false;
            if (scanInterval) clearInterval(scanInterval);
            linksToProcess = [];
            collectedUrls.clear();
            ignoredUrls.clear();
            removeScannerLine();
        }
    }
});
