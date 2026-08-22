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
        // Match both x.com and twitter.com, capturing both /status/, /article/, and /intent/ URLs
        const regex = /(?:https?:\/\/)?(?:www\.)?(?:x|twitter)\.com\/(?:[a-zA-Z0-9_]+\/(?:status|article)\/\d+|intent\/[a-zA-Z0-9_]+\?tweet_id=\d+)/gi;
        
        const matches = text.match(regex) || [];
        
        // Remove duplicates and normalize to https://x.com/...
        const uniqueLinks = [...new Set(matches)].map(link => {
            if (!link.startsWith('http')) link = 'https://' + link;
            link = link.replace('twitter.com', 'x.com');
            
            // Convert intent URLs to standard status URLs so the bot works on standard pages
            const intentMatch = link.match(/intent\/[a-zA-Z0-9_]+\?tweet_id=(\d+)/i);
            if (intentMatch) {
                link = `https://x.com/x/status/${intentMatch[1]}`;
            }
            
            return link;
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

    const resumeBtn = document.getElementById('resume-btn');
    const retryBtn = document.getElementById('retry-btn');

    startBtn.addEventListener('click', () => {
        if (extractedLinks.length === 0) return;
        
        startBtn.style.display = 'none';
        resumeBtn.style.display = 'none';
        retryBtn.style.display = 'none';
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

    resumeBtn.addEventListener('click', () => {
        startBtn.style.display = 'none';
        resumeBtn.style.display = 'none';
        retryBtn.style.display = 'none';
        stopBtn.style.display = 'block';
        bulkInput.disabled = true;
        extractBtn.disabled = true;
        
        queueStatus.textContent = 'Running';
        queueStatus.className = 'status-text running';
        
        chrome.runtime.sendMessage({ action: 'resume_bulk' });
    });

    retryBtn.addEventListener('click', () => {
        const failedLinks = [];
        document.querySelectorAll('.link-item.error a').forEach(a => {
            failedLinks.push(a.href);
        });

        if (failedLinks.length === 0) return;

        // Update local state and UI
        extractedLinks = failedLinks;
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
        resumeBtn.style.display = 'none';
        retryBtn.style.display = 'none';
        stopBtn.style.display = 'block';
        bulkInput.disabled = true;
        extractBtn.disabled = true;
        
        queueStatus.textContent = 'Running';
        queueStatus.className = 'status-text running';
        
        chrome.runtime.sendMessage({ action: 'start_bulk', links: failedLinks });
    });

    stopBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'stop_bulk' });
    });

    // Helper function to handle progress UI updates
    function handleProgress(request) {
        const { currentIndex, total, status, errorIndices } = request;
        
        // Update progress bar
        const percent = total > 0 ? (currentIndex / total) * 100 : 0;
        progressBar.style.width = `${percent}%`;
        progressText.textContent = `Processing ${currentIndex} of ${total}`;
        
        // Update link items
        let errorCount = errorIndices ? errorIndices.length : 0;
        document.querySelectorAll('.link-item').forEach((item, idx) => {
            item.classList.remove('active', 'done', 'error');
            
            if (errorIndices && errorIndices.includes(idx)) {
                item.classList.add('error');
            } else if (idx < currentIndex) {
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
                resumeBtn.style.display = 'none';
                if (errorCount > 0) {
                    retryBtn.style.display = 'block';
                    startBtn.style.display = 'none';
                    queueStatus.textContent = 'Completed with Errors';
                    queueStatus.className = 'status-text error';
                } else {
                    retryBtn.style.display = 'none';
                    queueStatus.textContent = 'Completed';
                    queueStatus.className = 'status-text done';
                }
                progressText.textContent = `Finished ${total} links. ${errorCount} failed.`;
                progressBar.style.width = '100%';
                progressBar.style.background = errorCount > 0 ? '#ef4444' : '#10b981';
            } else {
                startBtn.style.display = 'none';
                resumeBtn.style.display = 'block';
                retryBtn.style.display = 'none';
                queueStatus.textContent = 'Stopped';
                queueStatus.className = 'status-text idle';
                progressText.textContent = `Stopped at ${currentIndex} of ${total}. Failed: ${errorCount}`;
            }
        }
    }

    // Listen for progress updates from background.js
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'bulk_progress') {
            handleProgress(request);
        }
    });
    
    // Check if background is already running a job on load
    chrome.runtime.sendMessage({ action: 'get_bulk_status' }, (response) => {
        if (response && response.links && response.links.length > 0) {
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
            
            if (response.isRunning) {
                startBtn.style.display = 'none';
                resumeBtn.style.display = 'none';
                retryBtn.style.display = 'none';
                stopBtn.style.display = 'block';
                bulkInput.disabled = true;
                extractBtn.disabled = true;
                queueStatus.textContent = 'Running';
                queueStatus.className = 'status-text running';
                
                handleProgress({
                    action: 'bulk_progress',
                    currentIndex: response.currentIndex,
                    total: response.total,
                    status: 'running',
                    errorIndices: response.errorIndices || []
                });
            } else {
                // It was stopped or done. Call handleProgress to setup UI.
                handleProgress({
                    action: 'bulk_progress',
                    currentIndex: response.currentIndex,
                    total: response.total,
                    status: response.currentIndex >= response.total ? 'done' : 'stopped',
                    errorIndices: response.errorIndices || []
                });
            }
        }
    });
});
