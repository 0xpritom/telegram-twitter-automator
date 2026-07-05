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

    const skipRoll = Math.random();
    // 15% chance to skip commenting naturally
    if (skipRoll < 0.15) {
        return "SKIP_COMMENT";
    }

    const lengthRoll = Math.random();
    let lengthInstruction = "";
    if (lengthRoll < 0.3) {
        lengthInstruction = "Make the comment VERY short, just 1 to 4 words. Be extremely brief and punchy.";
    } else if (lengthRoll < 0.7) {
        lengthInstruction = "Make the comment medium length, about 5 to 12 words.";
    } else {
        lengthInstruction = "Make the comment a bit longer and more analytical, around 15 to 25 words.";
    }

    const mentionInstruction = "You may explicitly mention the name of the main project, topic, or username in your comment ONLY if the context makes it absolutely natural and necessary to do so. Otherwise, keep it casual without name-dropping.";
    
    let languageInstruction = `CRITICAL RULE: The original post was written in this language: "${langCode}". You MUST write your reply entirely in that exact language (e.g., if it says Japanese or 'ja', you must reply in Japanese).`;
    if (!langCode || langCode === 'unknown') {
        languageInstruction = `CRITICAL RULE: You must write the comment in the EXACT SAME LANGUAGE as the original post.`;
    }
    
    const prompt = `Act as an experienced person in this specific space. Read the following post. Identify the main character, main topic, or main project of the post, and write a human-like comment focusing specifically on that subject.
${lengthInstruction}
${mentionInstruction}
${languageInstruction} 
Keep it very natural, as if a real person is casually replying. Do not use hashtags.
Post: "${text}"`;
    
    const url = "https://api.groq.com/openai/v1/chat/completions";
    
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
