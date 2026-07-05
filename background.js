let telegramTabId = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'generate') {
        generateComment(request.text, request.lang)
            .then(reply => sendResponse({ reply }))
            .catch(error => sendResponse({ error: error.message }));
        return true; 
    }
    
    if (request.action === 'open_twitter_link') {
        telegramTabId = sender.tab.id;
        chrome.tabs.create({ url: request.url, active: true }, (tab) => {
            // Tab created, Twitter content script will automatically run on load
            sendResponse({ success: true, tabId: tab.id });
        });
        return true;
    }

    if (request.action === 'twitter_done' || request.action === 'twitter_error') {
        if (sender.tab && sender.tab.id) {
            chrome.tabs.remove(sender.tab.id);
        }
        if (telegramTabId) {
            chrome.tabs.sendMessage(telegramTabId, { action: 'next_link' });
        }
        sendResponse({ success: true });
        return true;
    }
});

async function generateComment(text, langCode) {
    const data = await chrome.storage.local.get(['apiKey']);
    const apiKey = data.apiKey;
    
    if (!apiKey) {
        throw new Error("No API key set in extension popup.");
    }

    const url = "https://api.groq.com/openai/v1/chat/completions";
    
    let languageInstruction = `CRITICAL RULE: The original post was written in this language: "${langCode}". You MUST write your reply entirely in that exact language (e.g., if it says Japanese or 'ja', you must reply in Japanese).`;
    if (!langCode || langCode === 'unknown') {
        languageInstruction = `CRITICAL RULE: You must write the comment in the EXACT SAME LANGUAGE as the original post.`;
    }
    
    const prompt = `Write a human-like comment or explanation responding to the following post. The comment must be between 5 and 10 words. ${languageInstruction} Do not use hashtags. Keep it natural. Post: "${text}"`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant", 
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7
            })
        });

        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error.message);
        }
        
        let comment = result.choices[0].message.content.trim();
        
        if (comment.startsWith('"') && comment.endsWith('"')) {
            comment = comment.substring(1, comment.length - 1);
        }

        return comment;

    } catch (e) {
        console.error("Groq API Error:", e);
        throw e;
    }
}
