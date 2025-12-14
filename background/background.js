// Background script handles contect menu creation and communication
// between parts of extension

//create context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
    createContextMenu();
});

//recreate context menu when extension startup
chrome.runtime.onStartup.addListener(() => {
    createContextMenu();
});

/**
 * Creates the context menu items to avoid duplications
 */
function createContextMenu() {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: "save-link-with-context",
            title: "Save Link with Context",
            contexts: ["selection"],
            documentUrlPatterns: ["http://*/*", "https://*/*"]
        });
    });
}

/**
 * Listen for messages from content script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'saveLink') {
        saveLinkWithContext(message.data)
            .then(() => sendResponse({ success: true }))
            .catch(error => {
                console.error('Error saving link:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true;
    }

    if (message.action === 'ping') {
        sendResponse({ success: true });
        return true;
    }
});

/**
 * handle context menu click
 *
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "save-link-with-context") {
        try {
            // Try to send message to content script
            await chrome.tabs.sendMessage(tab.id, {
                action: "saveContext",
                selectedText: info.selectionText
            });
        } catch (error) {
            console.log("Content script not available, using fallback...");

            // Fallback: Save directly without content script
            try {
                await saveLinkWithContext({
                    url: tab.url,
                    title: tab.title,
                    selectedText: info.selectionText,
                    domain: new URL(tab.url).hostname
                });
            } catch (fallbackError) {
                console.error("Failed to save link:", fallbackError);
            }
        }
    }
});

/**
 * Save the link with context to chrome storage
 * @param {Object} linkData - the link data to save
 */
async function saveLinkWithContext(linkData) {
    try {
        //get existing saved link data
        const result = await chrome.storage.local.get(['savedLinks']);
        const savedLinks = result.savedLinks || [];

        //Add new link
        const newLink = {
            id: Date.now().toString(),
            ...linkData,
            savedAt: new Date().toISOString()
        };
        savedLinks.unshift(newLink); //add to start of array

        //save back to chrome storage
        await chrome.storage.local.set({ savedLinks });

        //show notification
        chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/icon64.png'),
            title: 'Link library',
            message: 'Link saved with context...'
        });
    } catch (error) {
        console.error('Error in saving link: ', error);
    }
}