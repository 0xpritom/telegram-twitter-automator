let isRunning = false;
let selectionState = 'IDLE'; // IDLE, SELECTING_START, SCANNING
let linksToProcess = [];
let ignoredLinks = new Set();
let scanInterval = null;
let currentIndex = 0;
let startNode = null;

function createStatusUI() {
    if (document.getElementById('telegram-bot-status')) return;
    
    // ... UI setup ...
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
    
    // 1. START & SCAN BUTTON
    const scanBtn = document.createElement('button');
    scanBtn.id = 'telegram-bot-scan-btn';
    scanBtn.innerText = 'Select Start & Scan';
    scanBtn.style.cssText = `
        background: linear-gradient(135deg, #f59e0b, #ea580c);
        color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; width: 100%;
        font-weight: 600; font-size: 0.85rem; margin-bottom: 8px; transition: all 0.2s ease;
        box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
    `;
    
    // 2. RUN BUTTON
    const runBtn = document.createElement('button');
    runBtn.id = 'telegram-bot-run-btn';
    runBtn.innerText = 'Process 0 Links';
    runBtn.disabled = true;
    runBtn.style.cssText = `
        background: rgba(0, 0, 0, 0.04); color: #94a3b8; border: 1px solid rgba(0, 0, 0, 0.05); 
        padding: 8px 12px; border-radius: 6px; cursor: not-allowed; width: 100%;
        font-weight: 600; font-size: 0.85rem; margin-bottom: 8px; transition: all 0.2s ease;
    `;
    
    // 3. CLEAR BUTTON
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
    text.innerHTML = '<span style="color: #64748b; font-weight: 600; font-size: 0.75rem; text-transform: uppercase;">Status</span><br/><div style="margin-top: 4px; color: #475569;">Ready. Click "Select Start & Scan".</div>';
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
}

function updateStatus(message) {
    const textEl = document.getElementById('telegram-bot-text');
    if (textEl) {
        textEl.innerHTML = `<span style="color: #64748b; font-size: 0.75rem; text-transform: uppercase; font-weight: 600;">Status</span><br/><div style="margin-top: 4px; color: #475569;">${message.replace(/\n/g, '<br/>')}</div>`;
    }
    console.log("[Telegram-Bot]", message);
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

function removeScannerLine() {
    const lineEl = document.getElementById('telegram-bot-scan-line');
    if (lineEl) lineEl.remove();
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
        updateStatus("Click next to the message you want to start from.");
        document.body.style.cursor = 'crosshair';
        
    } else if (selectionState === 'SELECTING_START') {
        selectionState = 'IDLE';
        scanBtn.innerText = 'Select Start & Scan';
        enableButton('telegram-bot-scan-btn', 'orange');
        updateStatus("Selection cancelled.");
        document.body.style.cursor = 'default';
        
    } else if (selectionState === 'SCANNING') {
        selectionState = 'IDLE';
        clearInterval(scanInterval);
        removeScannerLine();
        
        scanBtn.innerText = 'Continue Scanning (No Start)';
        enableButton('telegram-bot-scan-btn', 'green');
        
        updateStatus(`Scanning paused. Collected ${linksToProcess.length} total links.`);
        
        if (linksToProcess.length > 0) {
            enableButton('telegram-bot-run-btn', 'blue');
            const runBtn = document.getElementById('telegram-bot-run-btn');
            runBtn.innerText = `Process ${linksToProcess.length} Links`;
            enableButton('telegram-bot-clear-btn', 'orange');
        }
    }
}

function handleGlobalClick(e) {
    if (selectionState !== 'SELECTING_START') return;
    if (e.target.closest('#telegram-bot-status')) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    document.body.style.cursor = 'default';
    
    startNode = e.target.closest('.message, .Message, .bubble, .message-list-item');
    if (!startNode) startNode = e.target;
    
    linksToProcess = [];
    ignoredLinks = new Set();
    
    // Draw the scanner line relative to the clicked element so it scrolls with the chat
    let lineEl = document.getElementById('telegram-bot-scan-line');
    if (lineEl) lineEl.remove();
    
    let lineContainer = document.createElement('div');
    lineContainer.id = 'telegram-bot-scan-line';
    lineContainer.style.cssText = `
        position: relative;
        width: 100%;
        height: 0;
        z-index: 999998;
    `;
    
    let linesWrapper = document.createElement('div');
    linesWrapper.style.cssText = `
        position: absolute;
        top: -6px; /* offset slightly so it centers around the click */
        left: -5000px;
        right: -5000px;
        display: flex;
        flex-direction: column;
        gap: 3px; /* spacing between the 3 lines */
        pointer-events: none;
    `;
    
    for (let i = 0; i < 3; i++) {
        let singleLine = document.createElement('div');
        singleLine.style.cssText = `
            width: 100%;
            height: 2px;
            background: #facc15;
            box-shadow: 0 0 10px rgba(250, 204, 21, 0.6);
            opacity: ${1 - (i * 0.15)}; /* slight fade on the bottom lines for a cool effect */
        `;
        linesWrapper.appendChild(singleLine);
    }
    
    lineContainer.appendChild(linesWrapper);
    
    if (startNode.parentElement) {
        startNode.parentElement.insertBefore(lineContainer, startNode);
    } else {
        startNode.appendChild(lineContainer);
    }
    
    selectionState = 'SCANNING';
    const scanBtn = document.getElementById('telegram-bot-scan-btn');
    scanBtn.innerText = 'Stop Scanning';
    enableButton('telegram-bot-scan-btn', 'red');
    
    updateStatus(`Scanning active! Started at the yellow line. Scroll down to capture all links below it.`);
    
    scanInterval = setInterval(scanForLinks, 200);
}

function clearLinks() {
    if (isRunning || selectionState === 'SCANNING') return;
    linksToProcess = [];
    ignoredLinks = new Set();
    const runBtn = document.getElementById('telegram-bot-run-btn');
    runBtn.innerText = 'Process 0 Links';
    disableButton('telegram-bot-run-btn');
    disableButton('telegram-bot-clear-btn');
    removeScannerLine();
    
    const scanBtn = document.getElementById('telegram-bot-scan-btn');
    scanBtn.innerText = 'Select Start & Scan';
    enableButton('telegram-bot-scan-btn', 'orange');
    
    updateStatus("Links cleared. Ready to start over.");
}

function scanForLinks() {
    if (!startNode) return;
    
    const currentLinks = getAllXLinks();
    let newLinksCount = 0;
    
    currentLinks.forEach(linkItem => {
        if (!ignoredLinks.has(linkItem.url) && !linksToProcess.includes(linkItem.url)) {
            // Check if link node is after or inside the startNode in the DOM
            const position = startNode.compareDocumentPosition(linkItem.node);
            const isAfterOrInside = (position & Node.DOCUMENT_POSITION_FOLLOWING) || 
                                    (position & Node.DOCUMENT_POSITION_CONTAINED_BY) || 
                                    startNode === linkItem.node;
            
            if (isAfterOrInside) {
                linksToProcess.push(linkItem.url);
                newLinksCount++;
            }
        }
    });
    
    if (newLinksCount > 0) {
        updateStatus(`Scanning active! Scanned ${linksToProcess.length} links so far. Scroll down to scan more.`);
    }
}

function getAllXLinks() {
    const result = [];
    const urlRegex = /(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)(?:\/[^\s<>"']*)?/gi;
    
    // 1. Get from 'a' tags
    const aTags = Array.from(document.querySelectorAll('a'));
    aTags.forEach(a => {
        let href = a.href || '';
        let text = a.textContent || '';
        
        if (href.toLowerCase().includes('x.com') || href.toLowerCase().includes('twitter.com') ||
            text.toLowerCase().includes('x.com') || text.toLowerCase().includes('twitter.com')) {
            let finalUrl = href;
            if (!href.toLowerCase().includes('x.com') && !href.toLowerCase().includes('twitter.com')) {
                const match = text.match(/(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)(?:\/[^\s<>"']*)?/i);
                if (match) {
                    finalUrl = match[0].replace(/[.,;!?)]+$/, '');
                    if (!finalUrl.startsWith('http')) finalUrl = 'https://' + finalUrl;
                }
            }
            
            if (finalUrl) {
                result.push({ url: finalUrl, node: a });
            }
        }
    });

    // 2. Get from text nodes
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
        if (node.parentElement && node.parentElement.closest('a')) continue;
        if (node.parentElement && (node.parentElement.tagName === 'SCRIPT' || node.parentElement.tagName === 'STYLE')) continue;
        
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
    
    // Remove duplicates
    const unique = [];
    const seen = new Set();
    result.forEach(item => {
        if (!seen.has(item.url)) {
            seen.add(item.url);
            unique.push(item);
        }
    });
    
    return unique;
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
        scanBtn.innerText = 'Continue Scanning';
        enableButton('telegram-bot-scan-btn', 'green');
        
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
        // Add a reaction to the link we just processed
        const processedUrl = linksToProcess[currentIndex];
        if (processedUrl) {
            reactToMessage(processedUrl);
        }
        
        currentIndex++;
        chrome.storage.local.get(['timeLimit'], (res) => {
            const delayInSeconds = (res.timeLimit !== undefined) ? parseInt(res.timeLimit, 10) : 0;
            
            if (delayInSeconds > 0 && currentIndex < linksToProcess.length) {
                updateStatus(`Waiting ${delayInSeconds}s before next link...`);
                setTimeout(() => {
                    processNextLink();
                }, delayInSeconds * 1000);
            } else {
                setTimeout(() => {
                    processNextLink();
                }, 1000);
            }
        });
        sendResponse({ success: true });
    }
});

function reactToMessage(url) {
    try {
        const aTags = Array.from(document.querySelectorAll('a'));
        let targetA = null;
        for (let a of aTags) {
            let href = a.href || '';
            let text = a.textContent || '';
            if (href === url || href.includes(url) || text.includes(url)) {
                targetA = a;
                break;
            }
        }
        
        if (targetA) {
            // Try to find the message container
            let container = targetA.closest('.message, .Message, .bubble, .message-list-item');
            if (!container) {
                container = targetA.parentElement; 
            }
            
            if (container) {
                // Simulate double click to trigger Telegram's default quick reaction
                const dblClickEvent = new MouseEvent('dblclick', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                container.dispatchEvent(dblClickEvent);
                console.log("[Telegram-Bot] Sent double-click reaction to:", url);
                
                // Add a visual indicator to the link locally as well
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
    if (res.enabled) {
        createStatusUI();
    }
});

chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled !== undefined) {
        if (changes.enabled.newValue) {
            createStatusUI();
        } else {
            const el = document.getElementById('telegram-bot-status');
            if (el) el.remove();
            isRunning = false;
            isScanning = false;
            if (scanInterval) clearInterval(scanInterval);
            linksToProcess = [];
        }
    }
});
