class LinkLibrarianPopup {
    constructor() {
        this.allKinks = [];
        this.filterdLinks = [];
        this.currentFilter = 'all',
            this.searchQuery = '';

        this.initializeElements();
        this.attachListeners();
        this.loadLinks();
    }

    /**
     * Initialize DOM element references
     */
    initializeElements() {
        this.elements = {
            linkCount: document.getElementById('linkCount'),
            searchInput: document.getElementById('searchInput'),
            linkContainer: document.getElementById('linksContainer'),
            clearSearch: document.getElementById('clearSearch'),
            loading: document.getElementById('loading'),
            filterTabs: document.querySelectorAll('.filter-tab'),
            emptyState: document.getElementById('emptyState')
        }
    }

    attachListeners() { }

    async loadLinks() { 
        
    }

    filterAndDisplayLinks() { }

    displayLinks() { }

    createLinkHTML(link) { }

    async deleteLink() { }

    async saveTags() { }

    showLoading(show) {

    }

    /**
     * show error message
     * @param {string} message - error message to display
     */
    showError(message) {
        console.error(message);
        alert(message);
    }

    /**
     * Format date for display
     * @param {string} dateString - ISO date string
     * @returns {string} - formatted date
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            return 'Today';
        } else if (diffDays === 2) {
            return 'Yesterday';
        } else if (diffDays <= 7) {
            return `${diffDays - 1} days ago`
        } else {
            return date.toLocaleDateString();
        }
    }

    /**
     * Escape HTML characters
     * @param {string} text - text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

