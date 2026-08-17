// --- Visual UI Setup ---
function createStatusUI() {
    if (document.getElementById('x-bot-status')) return;
    
    const statusBox = document.createElement('div');
    statusBox.id = 'x-bot-status';
    statusBox.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 24px;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 20px;
        color: #111827;
        z-index: 999999;
        font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
        min-width: 280px;
        max-width: 320px;
        pointer-events: none;
    `;
    
    const title = document.createElement('div');
    title.innerHTML = '✨ <b>X Automator</b>';
    title.style.marginBottom = '12px';
    title.style.fontSize = '1.1rem';
    
    const text = document.createElement('div');
    text.id = 'x-bot-text';
    text.innerText = 'Initializing...';
    text.style.fontSize = '14.5px';
    
    statusBox.appendChild(title);
    statusBox.appendChild(text);
    document.body.appendChild(statusBox);
}

function updateStatus(message, tweetElement = null) {
    createStatusUI();
    const textEl = document.getElementById('x-bot-text');
    if (textEl) textEl.innerText = message;
    console.log("[X-Bot]", message);
    
    document.querySelectorAll('.x-bot-highlight').forEach(el => {
        el.style.border = el.dataset.oldBorder || '';
        el.style.borderRadius = el.dataset.oldRadius || '';
        el.classList.remove('x-bot-highlight');
    });
    
    if (tweetElement) {
        tweetElement.dataset.oldBorder = tweetElement.style.border;
        tweetElement.dataset.oldRadius = tweetElement.style.borderRadius;
        tweetElement.style.border = '2px dashed #17BF63';
        tweetElement.style.borderRadius = '16px';
        tweetElement.classList.add('x-bot-highlight');
        
        const rect = tweetElement.getBoundingClientRect();
        if (rect.top < 0 || rect.bottom > window.innerHeight) {
            tweetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

function simulateClick(element) {
    const events = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
    events.forEach(ev => {
        element.dispatchEvent(new MouseEvent(ev, {
            view: window,
            bubbles: true,
            cancelable: true,
            buttons: 1
        }));
    });
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const randomDelay = (min, max) => sleep(Math.floor(Math.random() * (max - min + 1)) + min);

// Keep background script alive during long operations
const pingInterval = setInterval(() => {
    chrome.runtime.sendMessage({ action: 'ping' }).catch(() => {});
}, 10000);

async function finishProcess(success) {
    clearInterval(pingInterval);
    chrome.runtime.sendMessage({ action: success ? 'twitter_done' : 'twitter_error' });
}

async function startBot(actionMode, timeLimit, readMin, readMax, myUsername) {
    createStatusUI();
    updateStatus("Starting up on X...");
    
    // Wait for page to load main tweet
    await randomDelay(2000, 3000);
    
    try {
        updateStatus("Waiting for the page to fully load...");
        
        let tweet = null;
        for (let i = 0; i < 40; i++) { // Poll every 500ms for up to 20 seconds
            tweet = document.querySelector('article[data-testid="tweet"]');
            if (tweet) break;
            await sleep(500);
        }
        
        if (!tweet) {
            updateStatus("Tweet didn't load within 20 seconds. Skipping this link...");
            await sleep(2000);
            return finishProcess(false);
        }

        // Wait a couple of seconds to allow Twitter's UI (like/unlike buttons) to fetch and render
        updateStatus("Waiting for tweet UI state to settle...");
        await randomDelay(2000, 3000);

        let textElement = tweet.querySelector('div[data-testid="tweetText"]');
        let extractedText = "";
        if (textElement) {
            extractedText = textElement.innerText;
        } else {
            const heading = tweet.querySelector('h1, h2, [data-testid="article-title"]');
            if (heading) {
                extractedText = heading.innerText;
            } else {
                extractedText = tweet.innerText.substring(0, 500);
            }
        }

        if (!extractedText.trim() && (actionMode === 'comment' || actionMode === 'both')) {
            updateStatus("No text found in this tweet.", tweet);
            await randomDelay(2000, 3000);
            return finishProcess(false);
        }

        let tweetId = null;
        let authorName = null;
        let rawAuthorText = "";
        try {
            let match = window.location.href.match(/\/(?:status|article)\/(\d+)/);
            if (!match) match = window.location.href.match(/tweet_id=(\d+)/);
            if (match) tweetId = match[1];

            const userNameEl = tweet.querySelector('div[data-testid="User-Name"]');
            if (userNameEl) {
                rawAuthorText = userNameEl.innerText || "";
                authorName = rawAuthorText.split('\n')[0].trim();
            }
        } catch(e) {}
        
        if (myUsername && myUsername.trim() !== "" && rawAuthorText.toLowerCase().includes(myUsername.toLowerCase().trim())) {
            updateStatus("This is my own post! Skipping to avoid self-engagement...", tweet);
            await randomDelay(1500, 2500);
            return finishProcess(true);
        }

        const unlikeBtn = tweet.querySelector('[data-testid="unlike"]');
        if (unlikeBtn) {
            updateStatus("Tweet is already liked! Skipping entire process for extra safety...", tweet);
            await randomDelay(1500, 2500);
            return finishProcess(true);
        }
        
        if (actionMode === 'like' || actionMode === 'both') {
            updateStatus("Liking the tweet...", tweet);
            const likeBtn = tweet.querySelector('[data-testid="like"]');
            if (likeBtn) {
                simulateClick(likeBtn);
                await randomDelay(500, 800);
            } else {
                updateStatus("Like button not found.", tweet);
                await randomDelay(300, 500);
            }
            
            if (actionMode === 'like') {
                updateStatus("Like process finished! Moving back to Telegram...", tweet);
                await randomDelay(1000, 1500);
                return finishProcess(true);
            }
        }
        
        const tweetText = extractedText;
        let tweetLang = (textElement ? textElement.getAttribute('lang') : null) || 'unknown';
        
        const translationMatch = tweet.innerText.match(/Translated from ([A-Za-z]+)/i);
        if (translationMatch && translationMatch[1]) {
            tweetLang = translationMatch[1];
        }
        
        if (tweetId && (actionMode === 'comment' || actionMode === 'both')) {
            const isReplied = await new Promise(resolve => {
                chrome.storage.local.get(['repliedTweetsHistory'], (res) => {
                    resolve((res.repliedTweetsHistory || []).includes(tweetId));
                });
            });
            
            if (isReplied) {
                updateStatus("Already replied to this tweet previously! Skipping comment...", tweet);
                await randomDelay(1000, 1500);
                return finishProcess(true);
            }
        }
        
        if (actionMode === 'comment' || actionMode === 'both') {
            updateStatus(`Reading post... (Waiting ${readMin}s to ${readMax}s)`, tweet);
            await randomDelay(readMin * 1000, readMax * 1000);
        }
        
        updateStatus(`Thinking of a reply using AI...`, tweet);
        let replyText = null;
        try {
            replyText = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({ action: 'generate', text: tweetText, lang: tweetLang, author: authorName }, (response) => {
                    if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
                    else if (response && response.error) reject(new Error(response.error));
                    else resolve(response.reply);
                });
            });
        } catch (e) {
            updateStatus(`API Error: ${e.message}`, tweet);
            await randomDelay(4000, 5000);
            return finishProcess(false);
        }

        if (replyText === "SKIP_COMMENT") {
            updateStatus("Decided to skip commenting to mimic natural behavior.", tweet);
            await randomDelay(1000, 1500);
            return finishProcess(true);
        }

        if (!replyText || replyText.trim() === "") {
            updateStatus("AI generated an empty reply.", tweet);
            await randomDelay(1000, 1500);
            return finishProcess(false);
        }
        
        replyText = replyText.trim();
        if (replyText.length > 0) {
            replyText = replyText.charAt(0).toUpperCase() + replyText.slice(1);
        }
        if (replyText.endsWith('.')) {
            replyText = replyText.slice(0, -1);
        }

        updateStatus(`Generated Reply:\n"${replyText}"\n\nPreparing to click...`, tweet);
        await randomDelay(300, 600);

        const replyBtn = tweet.querySelector('[data-testid="reply"]');
        if (replyBtn) {
            updateStatus(`Clicking reply button...`, tweet);
            simulateClick(replyBtn);
            
            let textBox = null;
            for (let i = 0; i < 20; i++) { // Poll every 500ms for up to 10 seconds
                textBox = document.querySelector('[data-testid="tweetTextarea_0"]');
                if (textBox) break;
                await sleep(500);
            }
            
            if (textBox) {
                updateStatus(`Pasting reply...`, tweet);
                textBox.focus();
                await randomDelay(200, 400);
                
                const dataTransfer = new DataTransfer();
                dataTransfer.setData('text/plain', replyText);
                
                textBox.dispatchEvent(new ClipboardEvent('paste', {
                    clipboardData: dataTransfer,
                    bubbles: true,
                    cancelable: true
                }));
                
                await randomDelay(400, 800);
                
                const submitBtn = document.querySelector('[data-testid="tweetButton"]');
                if (submitBtn && !submitBtn.disabled) {
                    updateStatus(`Clicking send...`, tweet);
                    simulateClick(submitBtn);
                    
                    if (tweetId) {
                        chrome.storage.local.get(['repliedTweetsHistory'], (res) => {
                            let history = res.repliedTweetsHistory || [];
                            if (!history.includes(tweetId)) {
                                history.push(tweetId);
                                if (history.length > 1000) history = history.slice(-1000);
                                chrome.storage.local.set({ repliedTweetsHistory: history });
                            }
                        });
                    }
                    
                    updateStatus(`Reply process finished! Moving back to Telegram...`, tweet);
                    await randomDelay(1000, 1500);
                    return finishProcess(true);
                } else {
                    updateStatus(`Error: Send button not found or disabled.`, tweet);
                    await randomDelay(2000, 3000);
                    return finishProcess(false);
                }
            } else {
                updateStatus(`Error: Could not find text box in modal!`, tweet);
                await randomDelay(2000, 3000);
                return finishProcess(false);
            }
        } else {
            updateStatus(`Error: Could not find reply button on tweet!`, tweet);
            await randomDelay(2000, 3000);
            return finishProcess(false);
        }
        
    } catch (error) {
        updateStatus(`Fatal Error: ${error.message}`);
        console.error(error);
        await randomDelay(3000, 5000);
        return finishProcess(false);
    }
}

// Start processing as soon as page loads
window.addEventListener('load', () => {
    chrome.storage.local.get(['enabled', 'actionMode', 'timeLimit', 'readMin', 'readMax', 'myUsername'], (res) => {
        if (res.enabled) {
            const actionMode = res.actionMode || 'comment';
            const timeLimit = (res.timeLimit !== undefined) ? parseInt(res.timeLimit, 10) : 0;
            const readMin = (res.readMin !== undefined) ? parseInt(res.readMin, 10) : 3;
            const readMax = (res.readMax !== undefined) ? parseInt(res.readMax, 10) : 7;
            const myUsername = res.myUsername || "";
            // Small delay to ensure X finishes rendering initial shell
            setTimeout(() => {
                startBot(actionMode, timeLimit, readMin, readMax, myUsername);
            }, 2000);
        }
    });
});
