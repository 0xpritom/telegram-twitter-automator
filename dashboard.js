document.addEventListener('DOMContentLoaded', () => {
    const bulkInput = document.getElementById('bulk-input');
    const extractBtn = document.getElementById('extract-btn');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const linkCountBadge = document.getElementById('link-count-badge');
    const linkList = document.getElementById('link-list');
    const queueStatus = document.getElementById('queue-status');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    let extractedLinks = [];

    // Extract links using Regex
    extractBtn.addEventListener('click', () => {
        const text = bulkInput.value;
        // Match both x.com and twitter.com, capturing the full status URL
        const regex = /(?:https?:\/\/)?(?:www\.)?(?:x|twitter)\.com\/[a-zA-Z0-9_]+\/status\/\d+/g;
        
        const matches = text.match(regex) || [];
        
        // Remove duplicates and normalize to https://x.com/...
        const uniqueLinks = [...new Set(matches)].map(link => {
            if (!link.startsWith('http')) link = 'https://' + link;
            return link.replace('twitter.com', 'x.com');
        });

        extractedLinks = uniqueLinks;
        
        // Update UI
        linkCountBadge.textContent = `${extractedLinks.length} Links Found`;
        
        linkList.innerHTML = '';
        if (extractedLinks.length === 0) {
            linkList.innerHTML = '<div class="empty-state">No links found in the text.</div>';
            startBtn.disabled = true;
        } else {
            extractedLinks.forEach((link, index) => {
                const item = document.createElement('div');
                item.className = 'link-item';
                item.id = `link-item-${index}`;
                item.innerHTML = `
                    <div class="item-status"></div>
                    <a href="${link}" target="_blank" style="color: inherit; text-decoration: none;">${link}</a>
                `;
                linkList.appendChild(item);
            });
            startBtn.disabled = false;
        }
    });

    startBtn.addEventListener('click', () => {
        if (extractedLinks.length === 0) return;
        
        startBtn.style.display = 'none';
        stopBtn.style.display = 'block';
        bulkInput.disabled = true;
        extractBtn.disabled = true;
        
        queueStatus.textContent = 'Running';
        queueStatus.className = 'status-text running';
        
        chrome.runtime.sendMessage({ 
            action: 'start_bulk', 
            links: extractedLinks 
        });
    });

    stopBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'stop_bulk' });
    });

    // Listen for progress updates from background.js
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'bulk_progress') {
            const { currentIndex, total, status } = request;
            
            // Update progress bar
            const percent = total > 0 ? (currentIndex / total) * 100 : 0;
            progressBar.style.width = `${percent}%`;
            progressText.textContent = `Processing ${currentIndex} of ${total}`;
            
            // Update link items
            document.querySelectorAll('.link-item').forEach((item, idx) => {
                item.classList.remove('active');
                if (idx < currentIndex) {
                    item.classList.add('done');
                } else if (idx === currentIndex && status !== 'stopped' && status !== 'done') {
                    item.classList.add('active');
                    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            });

            if (status === 'done' || status === 'stopped') {
                startBtn.style.display = 'block';
                stopBtn.style.display = 'none';
                bulkInput.disabled = false;
                extractBtn.disabled = false;
                
                if (status === 'done') {
                    queueStatus.textContent = 'Completed';
                    queueStatus.className = 'status-text done';
                    progressText.textContent = `Finished processing ${total} links.`;
                    progressBar.style.width = '100%';
                    progressBar.style.background = '#10b981';
                } else {
                    queueStatus.textContent = 'Stopped';
                    queueStatus.className = 'status-text idle';
                    progressText.textContent = `Stopped at ${currentIndex} of ${total}.`;
                }
            }
        }
    });
    
    // Check if background is already running a job on load
    chrome.runtime.sendMessage({ action: 'get_bulk_status' }, (response) => {
        if (response && response.isRunning) {
            extractedLinks = response.links;
            linkCountBadge.textContent = `${extractedLinks.length} Links Loaded`;
            
            linkList.innerHTML = '';
            extractedLinks.forEach((link, index) => {
                const item = document.createElement('div');
                item.className = 'link-item';
                item.id = `link-item-${index}`;
                item.innerHTML = `
                    <div class="item-status"></div>
                    <a href="${link}" target="_blank" style="color: inherit; text-decoration: none;">${link}</a>
                `;
                linkList.appendChild(item);
            });
            
            startBtn.style.display = 'none';
            stopBtn.style.display = 'block';
            bulkInput.disabled = true;
            extractBtn.disabled = true;
            queueStatus.textContent = 'Running';
            queueStatus.className = 'status-text running';
            
            // Simulate a progress event to set the correct state
            chrome.runtime.onMessage.dispatch({
                action: 'bulk_progress',
                currentIndex: response.currentIndex,
                total: response.total,
                status: 'running'
            });
        }
    });
});
