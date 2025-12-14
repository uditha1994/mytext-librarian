// content script runs on all web pages 
// getting selected text and page information
// communication with background script

//prevent multiple initializations
let isInitialized = false;

//initialize the content script
function initializeContentScript() {
    if (isInitialized) {
        return;
    }
    isInitialized = true;
    console.log('MyText Librarian initialized');

    // check for save on this pages after short delay
    setTimeout(() => {
        hightlightSaveQuates();
    }, 1000);
}

//listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        if (message.action === 'ping') {
            sendResponse({ sucess: true });
            return true;
        }

        if (message.action === 'saveContext') {
            hadleSaveContext(message.selectedText);
            sendResponse({ sucess: true });
            return true;
        }

    } catch (error) {
        console.error('Error handling message: ', error);
        sendResponse({ sucess: false, error: error.message });
        return true;
    }
});

/**
 * Hangle saving context when user clicks context
 * @param {String} selectedText - the text selected by user
 */
function hadleSaveContext(selectedText) {
    try {
        //get page information
        const pageData = {
            url: window.location.href,
            title: document.title,
            selectedText: selectedText.trim(),
            domain: window.location.hostname
        }

        //send to background script yo save
        chrome.runtime.sendMessage({
            action: "saveLink",
            data: pageData
        }).then(response => {
            if (response && response.success) {
                highlightSelectedText();
            }
        }).catch(error => {
            console.error('Error sending save message:', error);
        })
    } catch (error) {
        console.error('Error handling save context:', error);
    }
}

function highlightSelectedText() {
    try {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);

            const span = document.createElement('span');
            span.style.backgroundColor = '#ffeb3b';
            span.style.borderRadius = '2px';
            span.style.padding = '1px 2px';
            span.style.transition = 'background-color 2s ease';

            try {
                range.surroundContents(span);

                setTimeout(() => {
                    if (span.parentNode) {
                        const parent = span.parentNode;
                        parent.insertBefore(document.createTextNode
                            (span.textContent), span);
                        parent.removeChild(span);
                        parent.normalize();
                    }
                }, 2000);
            } catch (error) {
                selection.removeAllRanges()
            }
        }

    } catch (error) {
        console.error('Error highlighting selected text:', error);
    }
}

/**
 * check if current page have any saved quotes and highlight
 */
async function hightlightSaveQuates() {
    try {
        const result = await chrome.storage.local.get(['savedLinks']);
        const savedLinks = result.savedLinks || [];

        //find links for current URL
        const currentUrl = window.location.href;
        const matchingLinks = savedLinks.filter
            (link => link.url === currentUrl);

        if (matchingLinks > 0) {
            matchingLinks.forEach(link => {
                highlightTextOnPage(link.selectedText, link.id);
            });
        }

    } catch (error) {
        console.error('Error highlighting saved quotes:', error);
    }
}

function highlightTextOnPage(textToHighlight, linkId) {
    try {
        //robust text search
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function (node) {
                    //skip script and stylr
                    const parent = node.parentElement;
                    if (parent && (parent.tagName === 'SCRIPT' ||
                        parent.tagName === 'STYLE')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            },
            false
        );

        const textNodes = [];
        let node;

        while (node = walker.nextNode()) {
            if (node.textContent.includes(textToHighlight)) {
                textNodes.push(node);
            }
        }

        textNodes.forEach(textNode => {
            try {
                const parent = textNode.parentNode;
                const text = textNode.textContent;
                const index = text.indexOf(textToHighlight);

                if (index !== -1) {
                    const beforeText = text.substring(0, index);
                    const highlightText = text.substring
                        (index, index + textToHighlight.length);
                    const afterText = text.substring(index + textToHighlight.length);

                    const span = document.createElement('span');
                    span.className = 'link-librarian-highlight';
                    span.style.backgroundColor = '#e3f2fd';
                    span.style.border = '1px solid #2196f3';
                    span.style.borderRadius = '2px';
                    span.style.padding = '1px 2px';
                    span.title = 'Saved quote from mytext-librarian';
                    span.textContent = highlightText;

                    //create document fragment
                    const fragment = document.createDocumentFragment();
                    if (beforeText) {
                        fragment.appendChild(document.createTextNode(beforeText));
                    }

                    fragment.appendChild(span);

                    if (afterText) {
                        fragment.appendChild(document.createTextNode(afterText));
                    }

                    parent.insertBefore(fragment, textNode);
                    parent.removeChild(textNode);
                }

            } catch (error) {
                console.error('Error highlighing individual text:', error);
            }
        })

    } catch (error) {
        console.error('Error in highlight text on page', error);
    }
}

// ..initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
    initializeContentScript();
}

//also initialize on page load as a fallback
window.addEventListener('load', initializeContentScript);