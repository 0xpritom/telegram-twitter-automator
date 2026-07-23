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

    const lengthRoll = Math.random();
    let lengthInstruction = "Write exactly between 7 to 14 words. Your comment must strictly be between 7 and 14 words long.";

    const formatRoll = Math.random();
    let formatInstruction = "";
    if (formatRoll < 0.7) {
        formatInstruction = "Be extremely casual with your formatting. Type like a real person on Twitter: do NOT use perfect capitalization (maybe start with a lowercase letter) and do NOT use a period at the very end of your comment.";
    } else {
        formatInstruction = "Use normal, casual capitalization and punctuation.";
    }
    
    const questionRoll = Math.random();
    let questionInstruction = "";
    if (questionRoll < 0.2) {
        questionInstruction = "Instead of making a statement, ask a highly relevant, genuine question about the project or topic discussed in the post.";
    }

    const mentionInstruction = "You may explicitly mention the name of the main project, topic, or username in your comment ONLY if the context makes it absolutely natural and necessary to do so. Otherwise, keep it casual without name-dropping.";
    
    let languageInstruction = `CRITICAL RULE: The original post was written in this language: "${langCode}". You MUST write your reply entirely in that exact language (e.g., if it says Japanese or 'ja', you must reply in Japanese).`;
    if (!langCode || langCode === 'unknown') {
        languageInstruction = `CRITICAL RULE: You must write the comment in the EXACT SAME LANGUAGE as the original post.`;
    }
    
    const prompt = `Act as an experienced person in this specific space. Read the following post. Identify the main character, main topic, or main project of the post.
    
Write a human-like comment focusing specifically on that subject.
CRITICAL BEHAVIORS:
1. Mirror the emotional tone of the post (if they are hyped, be hyped. If they are serious, be serious).
2. ${lengthInstruction}
3. ${formatInstruction}
4. ${questionInstruction}
5. ${mentionInstruction}
6. ${languageInstruction}

Keep it very natural, as if a real person is casually replying. Do not use hashtags.

IMPORTANT: Output ONLY the raw comment text. DO NOT wrap your comment in quotes. DO NOT use prefixes like "Comment:" or "Reply:". Just output the raw text directly.

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
        
        // Strip common prefixes AI sometimes adds
        comment = comment.replace(/^(Comment|Reply|Response):\s*/i, '');
        // Aggressively strip any surrounding quotes (single or double)
        comment = comment.replace(/^["']+|["']+$/g, '');
        comment = comment.trim();

        return comment;

    } catch (e) {
        console.error("Groq API Error:", e);
        throw e;
    }
}
