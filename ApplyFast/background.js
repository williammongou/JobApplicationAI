// ── ApplyFast Service Worker ────────────────────────────────────

// Listen for job detection messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'jobDetected') {
    // Store the latest detected job for quick access
    chrome.storage.local.set({
      lastJob: {
        data: message.data,
        url: message.url,
        timestamp: Date.now(),
      },
    });

    // Update badge to indicate a job was found
    chrome.action.setBadgeText({ text: '1', tabId: sender.tab?.id });
    chrome.action.setBadgeBackgroundColor({ color: '#22c55e', tabId: sender.tab?.id });

    sendResponse({ received: true });
  }
  return true;
});

// Clear badge when navigating away from job pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    const url = tab.url || '';
    const isJobPage =
      url.includes('linkedin.com/jobs') ||
      url.includes('linkedin.com/job') ||
      url.includes('indeed.com/viewjob') ||
      url.includes('indeed.com/jobs');

    if (!isJobPage) {
      chrome.action.setBadgeText({ text: '', tabId });
    }
  }
});

// Initialize default profile on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('userProfile', (data) => {
    if (!data.userProfile) {
      chrome.storage.local.set({
        userProfile: {
          name: '',
          title: '',
          skills: '',
          experience: '',
          location: '',
        },
      });
    }
  });
});
