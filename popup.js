document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('api-key');
    const toggleBot = document.getElementById('toggle-bot');
    const timeLimitInput = document.getElementById('time-limit');
    const saveBtn = document.getElementById('save-btn');
    const messageEl = document.getElementById('message');
    const statusText = document.getElementById('status-text');
    const statusDot = document.getElementById('status-dot');

    function updateUI(enabled) {
        if (enabled) {
            statusText.textContent = "Active";
            statusText.style.color = "#10b981";
            statusDot.classList.add("active");
            toggleBot.checked = true;
        } else {
            statusText.textContent = "Inactive";
            statusText.style.color = "#f87171";
            statusDot.classList.remove("active");
            toggleBot.checked = false;
        }
    }

    // Load saved settings
    chrome.storage.local.get(['apiKey', 'enabled', 'actionMode', 'timeLimit'], (result) => {
        if (result.apiKey) apiKeyInput.value = result.apiKey;
        if (result.timeLimit !== undefined) timeLimitInput.value = result.timeLimit;
        
        if (result.actionMode) {
            const radio = document.querySelector(`input[name="action-mode"][value="${result.actionMode}"]`);
            if (radio) radio.checked = true;
        }
        
        updateUI(result.enabled);
    });

    // Save settings
    saveBtn.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        const enabled = toggleBot.checked;
        const timeLimit = parseInt(timeLimitInput.value, 10) || 0;
        const actionModeRadio = document.querySelector('input[name="action-mode"]:checked');
        const actionMode = actionModeRadio ? actionModeRadio.value : 'comment';

        chrome.storage.local.set({ apiKey, enabled, actionMode, timeLimit }, () => {
            messageEl.textContent = 'Settings saved successfully!';
            updateUI(enabled);
            
            setTimeout(() => {
                messageEl.textContent = '';
            }, 2500);
        });
    });
});
