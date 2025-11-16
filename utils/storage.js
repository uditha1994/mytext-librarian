class StorageManager {
    static async getAllLinks() {
        try {
            const result = await chrome.storage.local.get(['savedLinks']);
            return result.savedLinks || [];
        } catch (error) {
            console.error('Error getting links:', error);
            return [];
        }
    }

    static async saveLinks(linkData) {
        try {
            const links = await this.getAllLinks();
            const newLink = {
                ...linkData,
                savedAt: new Date().toISOString()
            };
            links.unshift(newLink);
            await chrome.storage.local.set({ savedLinks: links });
            return true;
        } catch (error) {
            console.error('Error saving Link: ', error);
            return false;
        }
    }

    static async deleteLink(linkId) {
        try {
            const links = await this.getAllLinks();
            const filteredLinks = links.filter(link => link.id !== linkId);
            await chrome.storage.local.set({ savedLinks: filteredLinks });
            return true;
        } catch (error) {
            console.error('Error deleting link:', error);
            return false;
        }
    }

    static async updateLinkTags(linkId, tags) {
        try {
            const links = await this.getAllLinks();
            const linkIndex = links.findIndex(link => link.id === linkId);

            if (linkIndex !== -1) {
                links[linkIndex].tags = tags;
                await chrome.storage.local.set({ savedLinks: links });
                return true
            }
        } catch (error) {
            console.error('Error updating tags', error);
            return false;
        }
    }

    static async searchLinks(qury) {
        try {
            const links = await this.getAllLinks();
            const lowercaseQuery = qury.toLowerCase();

            return links.filter(link =>
                link.title.toLowerCase().include(lowercaseQuery) ||
                link.domain.toLowerCase().include(lowercaseQuery) ||
                link.selectedText.toLowerCase().include(lowercaseQuery) ||
                (link.tags && link.tags.some
                    (tag => tag.toLowerCase().include(lowercaseQuery)))
            );
        } catch (error) {
            console.error('error searching links:', error);
            return [];
        }
    }
}

//make available globally if needed
if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;
}