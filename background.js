const casualWordBank = [
    "honestly", "literally", "actually", "basically", "kinda", "sorta", "tbh", "imo", "ngl", 
    "fr", "tho", "yep", "nope", "yeah", "nah", "yup", "btw", "haha", "lol", "damn", "bro", 
    "dude", "man", "guys", "fam", "folks", "mate", "wild", "crazy", "insane", "valid", 
    "based", "lowkey", "highkey", "deadass", "bruh", "100%", "facts", 
    "big facts", "no cap", "vibes", "fire", "dope", "sick", "legendary", "epic", 
    "goat", "bet", "word", "real", "true", "exactly", "spot on", 
    "nailed it", "frfr", "iykyk", "bullish", "bearish", "gem", 
    "alpha", "frens", "anon", "degens", "normies", "wagmi", "ngmi", "fud", "fomo", 
    "rekt", "moon", "lfg", "gm", "gn", "ser", 
    "based", "chad", "ape", "grind", "sheesh",
    "yikes", "oof", "rip", "gg", "af", "rn", "atm", "omg",
    "lmao", "smh", "nvm", "idk", "idc", "imho", "tldr", "fyi", "def", "totes", "obvs", "probs", "srsly",
    "legit", "literally", "basically", "essentially", "apparently",
    "obviously", "definitely", "absolutely", "totally", "completely",
    "wow", "whoa", "woah", "jeez", "heck",
    "yo", "hey", "sup", "peace",
    "cya", "later", "cheers", "thx", "ty", "my bad", "mb", "cool", "nice", "sweet", "awesome",
    "amazing", "great", "okay",
    "ok", "k", "kk", "alright", "aight", "sure", "fine", "whatever", "anyways",
    "like", "just", "really", "very", "so",
    "way", "crazy", "insane", "wild", "mad", "nutty", "ridiculous",
    "unreal", "epic",
    "legendary", "god tier", "top tier", "mid"
];

let telegramTabId = null;
let desktopTabId = null;
let desktopQueue = [];
let isProcessingDesktop = false;
let ws = null;

function connectWebSocket() {
    ws = new WebSocket('ws://localhost:8765');
    
    ws.onopen = () => {
        console.log("[Desktop Bridge] Connected to Python Server");
    };
    
    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.action === 'new_links' && data.links) {
                chrome.storage.local.get(['desktopEnabled'], (res) => {
                    if (!res.desktopEnabled) {
                        console.log("[Desktop Bridge] Links received, but Desktop Bridge is disabled in settings. Ignoring.");
                        return;
                    }
                    
                    let added = 0;
                    for (let link of data.links) {
                        if (!desktopQueue.includes(link)) {
                            desktopQueue.push(link);
                            added++;
                        }
                    }
                    console.log(`[Desktop Bridge] Added ${added} new links. Queue size: ${desktopQueue.length}`);
                    
                    if (!isProcessingDesktop && desktopQueue.length > 0) {
                        processNextDesktopLink();
                    }
                });
            }
        } catch (e) {
            console.error("WebSocket message error:", e);
        }
    };
    
    ws.onclose = () => {
        setTimeout(connectWebSocket, 5000); 
    };
}

connectWebSocket();

function processNextDesktopLink() {
    if (desktopQueue.length === 0) {
        isProcessingDesktop = false;
        console.log("[Desktop Bridge] All links processed.");
        return;
    }
    
    isProcessingDesktop = true;
    const url = desktopQueue[0];
    
    chrome.tabs.create({ url: url, active: true }, (tab) => {
        desktopTabId = tab.id;
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'get_ws_status') {
        sendResponse({ connected: ws && ws.readyState === WebSocket.OPEN });
        return true;
    }
    
    if (request.action === 'generate') {
        generateComment(request.text, request.lang, request.author)
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
            
            if (sender.tab.id === desktopTabId) {
                desktopTabId = null;
                chrome.storage.local.get(['timeLimit'], (res) => {
                    const delay = (res.timeLimit !== undefined) ? parseInt(res.timeLimit, 10) * 1000 : 1000;
                    setTimeout(() => {
                        desktopQueue.shift();
                        processNextDesktopLink();
                    }, delay);
                });
            } else if (telegramTabId) {
                chrome.tabs.sendMessage(telegramTabId, { action: 'next_link' });
            }
        }
        sendResponse({ success: true });
        return true;
    }
});

async function generateComment(text, langCode, authorHandle) {
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

    // (Removed old contradictory mentionInstruction logic)
    
    let languageInstruction = `CRITICAL RULE: The original post was written in this language: "${langCode}". You MUST write your reply entirely in that exact language (e.g., if it says Japanese or 'ja', you must reply in Japanese).`;
    if (!langCode || langCode === 'unknown') {
        languageInstruction = `CRITICAL RULE: You must write the comment in the EXACT SAME LANGUAGE as the original post.`;
    }
    
    let authorInstruction = "";
    if (authorHandle && Math.random() < 0.30) {
        const firstName = authorHandle.split(' ')[0];
        authorInstruction = `CRITICAL RULE: You MUST start your comment by casually addressing the poster by their first name: "${firstName}" (e.g. "${firstName}, tbh this is wild"). NEVER put their name in the middle or at the end. NEVER put an '@' symbol before their name.`;
    }
    
    const shuffledWords = casualWordBank.sort(() => 0.5 - Math.random());
    const randomWords = shuffledWords.slice(0, 6).join(", ");
    
    // Extract @mentions from the text to enforce their usage
    const projectMentions = (text || "").match(/@\w+/g);
    let exactMentionRule = "Do not use the '@' symbol or any @usernames in your reply.";
    if (projectMentions && projectMentions.length > 0) {
        if (Math.random() < 0.20) {
            const uniqueMentions = [...new Set(projectMentions)].join(', ');
            const exampleMention = projectMentions[0];
            exactMentionRule = `\nCRITICAL RULE ABOUT PROJECTS: The original post tags these specific handles: ${uniqueMentions}. You MUST casually mention the project in your reply. When you do, YOU ABSOLUTELY MUST INCLUDE THE '@' SYMBOL. For example, write "${exampleMention}". DO NOT write the name without the '@'. DO NOT use any other @usernames.`;
        }
    }
    
    const prompt = `Act as a regular, everyday Twitter user casually scrolling through your feed. The posts in your feed are heavily project-related. Read the following post and write a 'mindshare' style comment focusing on the main project or topic.

CRITICAL BEHAVIORS FOR HUMAN-LIKE REPLIES:
1. Meaningful but Casual: You MUST provide an actual insight or relevant opinion about the project/topic. DO NOT just write an empty reaction like "damn bro this is crazy". However, your insight MUST be written in an extremely casual, lazy, internet-native tone.
2. Vocabulary: DO NOT use formal or AI-like words ('insightful', 'delve', 'realm', 'crucial'). Write like a real, everyday human on Crypto/Tech Twitter. 
IMPORTANT: Never start your comments with the same word repeatedly (do NOT always start with 'Tbh', 'Honestly', or 'Bro'). Use varied, natural sentence structures and a casual vibe.
Optional Vibe Check: If it feels completely natural, you may casually use words similar to these: [ ${randomWords} ]. But DO NOT force them. Just adopt their casual vibe.
3. Mindshare & Projects: Casually react to the main project or topic. ${exactMentionRule}
4. Tone: Keep it conversational, raw, and direct. Do not sound like an analytical essay. Mirror the emotional tone of the post.
5. Formatting & Punctuation: Keep formatting extremely lazy. DO NOT use commas (,), hyphens (-), or underscores (_). Start with a lowercase letter and use no final period. Do not provide explanations or enclose the comment in quotes.
6. ${lengthInstruction}
7. ${formatInstruction}
8. ${questionInstruction}
9. ${languageInstruction}
10. ${authorInstruction}

Keep it extremely natural and raw, as if a real person is casually replying from their phone. Do not use hashtags.

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
