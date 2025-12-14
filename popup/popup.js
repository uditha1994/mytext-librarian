class LinkLibrarianPopup {
    constructor() {
        this.allLinks = [];
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
            linkContainer: document.getElementById('linkContainer'),
            clearSearch: document.getElementById('clearSearch'),
            loading: document.getElementById('loading'),
            filterTabs: document.querySelectorAll('.filter-tab'),
            emptyState: document.getElementById('emptyState')
        }
    }

    attachListeners() {
        //click to open link
        document.querySelectorAll('.link-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.link-action') ||
                    e.target.classList.contains('tag-input')) {
                    return;
                }

                const linkId = item.dataset.linkId;
                const link = this.allLinks.find(l => l.id === linkId);

                if (link) {
                    chrome.tabs.create({ url: link.url });
                }
            });
        });

        //delete button
        document.querySelectorAll('.action-btn.delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const linkId = e.target.closest('.link-item').dataset.linkId;
                this.deleteLink(linkId);
            });
        });

        //edit tag buttons
        document.querySelectorAll('.action-btn.edit-tags').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const linkItem = e.target.closest('.link-item');
                const tagInput = linkItem.querySelector('.tag-input');
                tagInput.classList.add('active');
                tagInput.focus();
                tagInput.select();
            });
        });

        //tag input handling
        document.querySelectorAll('.tag-input').forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.saveTags(e.target);
                } else if (e.key === 'Escape') {
                    e.target.classList.remove('active');
                }
            });
            input.addEventListener('blur', (e) => {
                this.saveTags(e.target);
            });
        });

    }

    async loadLinks() {
        try {
            this.showLoading(true);
            this.allLinks = await StorageManager.getAllLinks();
            this.filterAndDisplayLinks();
        } catch (error) {
            console.error('Error loading links:', error);
            this.showError('Failed to load links');
        } finally {
            this.showLoading(false);
        }
    }

    filterAndDisplayLinks() {
        let filtered = [...this.allLinks];

        //apply filter
        switch (this.currentFilter) {
            case 'recent':
                const oneWeekago = new Date();
                oneWeekago.setDate(oneWeekago.getDate() - 7);
                filtered = filtered.filter(link =>
                    new Date(link.savedAt) > oneWeekago
                );
                break;

            case 'tagged':
                filtered = filtered.filter(link =>
                    link.tags && link.tags.length > 0
                );
                break;

            //'all' - no need additional filters
        }

        //apply search
        if (this.searchQuery.trim()) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(link =>
                link.title.toLowerCase().includes(query) ||
                link.selectedText.toLowerCase().includes(query) ||
                link.domain.toLowerCase().includes(query) ||
                (link.tags && link.tags.some(tag =>
                    tag.toLowerCase().includes(query)
                ))
            );
        }

        this.filterdLinks = filtered;
        this.displayLinks();
    }

    /**
     * Display the filterd links in the UI
     */
    displayLinks() {
        const container = this.elements.linkContainer;

        if (this.filterdLinks.length === 0) {
            container.style.display = 'none';
            this.elements.emptyState.style.display = 'block';
            return;
        }

        container.style.display = 'block';
        this.elements.emptyState.style.display = 'none';

        container.innerHTML = this.filterdLinks.
            map(link => this.createLinkHTML(link)).join('');

        this.attachListeners();
    }


    /**
     * create HTML for a single link item
     * @param {Object} link - link data object
     * @returns {string} HTML string
     */
    createLinkHTML(link) {
        const formattedDate = this.formatDate(link.savedAt);
        const highlightedTitle = this.highlightedSearchTerm(link.title);
        const highlightedQuate = this.highlightedSearchTerm(link.selectedText);

        const tagsHTML = link.tags && link.tags.length > 0
            ? `<div class="tags-container">
                ${link.tags.map(tag =>
                `<span class="tag">${this.highlightedSearchTerm(tag)}</span>`
            ).join('')}
            </div>`
            : '';

        return `
                <div class="link-item" data-link-id="${link.id}">
                    <div class="link-header">
                        <div class="link-title">${highlightedTitle}</div>
                        <div class="link-actions">
                            <button class="action-btn edit-tags"
                            title="Edit Tags">🏷️</button>
                            <button class="action-btn delete"
                            title="Delete">🗑️</button>
                        </div>
                    </div>

                    <div class="link-quote">${highlightedQuate}</div>

                    <div class="link-meta">
                        <span class="link-domain">${link.domain}</span>
                        <span class="link-date">${formattedDate}</span>
                    </div>

                    ${tagsHTML}

                    <input type="text" class="tag-input"
                    placeholder="Add tags" 
                    value="${link.tags ? link.tags.join(', ') : ''}">
                </div>
            `;
    }

    attachLinkEventListeners() {
        //click to open link
        document.querySelectorAll('.link-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.link-actions') || e.target.classList.contains('tag-input')) {
                    return;
                }
                const linkId = item.dataset.linkId;
                const link = this.allLinks.find(l => l.id === linkId);
                if (link) {
                    chrome.tabs.create({ url: link.url });
                }
            });
        });

        //delete button
        document.querySelectorAll('.action-btn.detete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const linkId = e.target.closest('.link-item').dataset.linkId;
                this.deleteLink(linkId);
            });
        });

        //edit tag button
        document.querySelectorAll('.action-btn.edit-tags').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const linkItem = e.target.closest('.link-item');
                const tagInput = linkItem.querySelector('.tag-input');
                tagInput.classList.add('active');
                tagInput.focus();
                tagInput.select();
            });
        });
    }

    async deleteLink(linkId) {
        if (!confirm('Are you sure want to delete this link?')) {
            return;
        }

        try {
            await StorageManager.deleteLink(linkId);

            this.allLinks = this.allLinks.filter
                (link => link.id !== linkId);
            this.updateLinkCount();
            this.filterAndDisplayLinks();

        } catch (error) {
            console.error('Error deleting link:', error);
            this.showError('Failed to delete link');
        }
    }

    /**
     * save tags for a link
     * @param {HTML Elemeny} tagInput - the tag input element
     */
    async saveTags(tagInput) {
        const linkItem = tagInput.closest('.link-item');
        const linkId = linkItem.dataset.linkId;
        const tagsText = tagInput.value.trim();

        const tags = tagsText.split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);

        try {
            await StorageManager.updateLinkTags(linkId, tags);
            //update local data
            const link = this.allLinks.find(l => l.id === linkId);
            if (link) {
                link.tags = tags;
            }

            tagInput.classList.remove('active');
            this.filterAndDisplayLinks();//refresh display
        } catch (error) {
            console.error('Error saving tags:', error);
            this.showError('failed to save tags');
        }
    }

    /**
     * update the link count display
     */
    updateLinkCount() {
        const count = this.allLinks.length;
        const text = count === 1 ? 'One link saved' :
            `${count} links saved`;
        this.elements.linkCount.textContent = text;
    }

    highlightedSearchTerm(text) {
        if (!this.searchQuery.trim()) {
            return this.escapeHtml(text);
        }

        const escapedText = this.escapeHtml(text);
        const escapedQuery = this.escapeHtml(this.searchQuery);
        const regex = new RegExp(`(${escapedQuery})`, 'gi');

        return escapedText.replace(regex,
            '<span class="search-highlight">$1</span>');
    }

    showLoading(show) {
        this.elements.loading.style.display = show ? 'block' : 'none';
        this.elements.linkContainer.style.display = show ? 'none' : 'block';
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

//initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LinkLibrarianPopup();
});

//listen for storage changes to real time UI update
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.saveLinks) {
        //reload links if were changed with another context
        window.location.reload();
    }
});