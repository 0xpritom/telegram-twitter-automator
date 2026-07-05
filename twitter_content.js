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

async function finishProcess(success) {
    chrome.runtime.sendMessage({ action: success ? 'twitter_done' : 'twitter_error' });
}

async function startBot(actionMode, timeLimit) {
    createStatusUI();
    updateStatus("Starting up on X...");
    
    // Wait for page to load main tweet
    await randomDelay(2000, 3000);
    
    try {
        updateStatus("Looking for the main tweet...");
        // Get the first tweet on the page, which is usually the main one when opened via link
        const tweet = document.querySelector('article[data-testid="tweet"]');
        
        if (!tweet) {
            updateStatus("No tweet found on this page.");
            await randomDelay(2000, 3000);
            return finishProcess(false);
        }

        const textElement = tweet.querySelector('div[data-testid="tweetText"]');
        if (!textElement && (actionMode === 'comment' || actionMode === 'both')) {
            updateStatus("No text found in this tweet.", tweet);
            await randomDelay(2000, 3000);
            return finishProcess(false);
        }
        
        if (actionMode === 'like' || actionMode === 'both') {
            updateStatus("Liking the tweet...", tweet);
            const likeBtn = tweet.querySelector('[data-testid="like"]');
            if (likeBtn) {
                simulateClick(likeBtn);
                await randomDelay(1500, 2500);
            } else {
                updateStatus("Like button not found or already liked.", tweet);
                await randomDelay(1000, 1500);
            }
            
            if (actionMode === 'like') {
                updateStatus("Like process finished! Moving back to Telegram...", tweet);
                await randomDelay(2000, 3000);
                return finishProcess(true);
            }
        }
        
        const tweetText = textElement.innerText;
        let tweetLang = textElement.getAttribute('lang') || 'unknown';
        
        const translationMatch = tweet.innerText.match(/Translated from ([A-Za-z]+)/i);
        if (translationMatch && translationMatch[1]) {
            tweetLang = translationMatch[1];
        }
        
        updateStatus(`Reading tweet...\n"${tweetText.substring(0, 40)}..."`, tweet);
        await randomDelay(1000, 2000);

        updateStatus(`Thinking of a reply using Grok AI...`, tweet);
        
        let replyText = null;
        try {
            replyText = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({ action: 'generate', text: tweetText, lang: tweetLang }, (response) => {
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

        if (!replyText || replyText.trim() === "") {
            updateStatus("Grok generated an empty reply.", tweet);
            await randomDelay(2000, 2000);
            return finishProcess(false);
        }

        updateStatus(`Generated Reply:\n"${replyText}"\n\nPreparing to click...`, tweet);
        await randomDelay(1000, 1500);

        const replyBtn = tweet.querySelector('[data-testid="reply"]');
        if (replyBtn) {
            updateStatus(`Clicking reply button...`, tweet);
            simulateClick(replyBtn);
            
            await randomDelay(1500, 2000); 
            
            const textBox = document.querySelector('[data-testid="tweetTextarea_0"]');
            if (textBox) {
                updateStatus(`Typing reply...`, tweet);
                textBox.focus();
                
                document.execCommand('insertText', false, replyText);
                
                if (textBox.innerText.trim() === "") {
                    updateStatus(`Fallback typing...`, tweet);
                    const dataTransfer = new DataTransfer();
                    dataTransfer.setData('text/plain', replyText);
                    textBox.dispatchEvent(new ClipboardEvent('paste', {
                        clipboardData: dataTransfer,
                        bubbles: true,
                        cancelable: true
                    }));
                }
                
                await randomDelay(1000, 1500);
                
                const submitBtn = document.querySelector('[data-testid="tweetButton"]');
                if (submitBtn && !submitBtn.disabled) {
                    updateStatus(`Clicking send...`, tweet);
                    simulateClick(submitBtn);
                    
                    updateStatus(`Reply process finished! Moving back to Telegram...`, tweet);
                    await randomDelay(2000, 3000);
                    return finishProcess(true);
                } else {
                    updateStatus(`Error: Send button not found or disabled.`, tweet);
                    await randomDelay(3000, 3000);
                    return finishProcess(false);
                }
            } else {
                updateStatus(`Error: Could not find text box in modal!`, tweet);
                await randomDelay(4000, 4000);
                return finishProcess(false);
            }
        } else {
            updateStatus(`Error: Could not find reply button on tweet!`, tweet);
            await randomDelay(3000, 3000);
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
    chrome.storage.local.get(['enabled', 'actionMode', 'timeLimit'], (res) => {
        if (res.enabled) {
            const actionMode = res.actionMode || 'comment';
            const timeLimit = (res.timeLimit !== undefined) ? parseInt(res.timeLimit, 10) : 0;
            // Small delay to ensure X finishes rendering initial shell
            setTimeout(() => {
                startBot(actionMode, timeLimit);
            }, 2000);
        }
    });
});
