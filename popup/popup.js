class LinkLibrarianPopup {
    constructor() {
        this.allLinks = [];
        this.filteredLinks = [];
        this.currentFilter = 'all';
        this.searchQuery = '';

        this.initializeElements();
        this.attachEventListeners();
        this.loadLinks();
    }

    initializeElements() {
        this.elements = {
            linkCount: document.getElementById('linkCount'),
            searchInput: document.getElementById('searchInput'),
            clearSearch: document.getElementById('clearSearch'),
            linksContainer: document.getElementById('linksContainer'),
            emptyState: document.getElementById('emptyState'),
            loading: document.getElementById('loading'),
            filterBtns: document.querySelectorAll('.filter-btn'),
            filterIndicator: document.querySelector('.filter-indicator'),
            allCount: document.getElementById('allCount'),
            recentCount: document.getElementById('recentCount'),
            taggedCount: document.getElementById('taggedCount')
        };
    }

    attachEventListeners() {
        // Search functionality
        this.elements.searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.trim();
            this.filterAndDisplayLinks();
            this.updateClearButton();
        });

        // Clear search
        this.elements.clearSearch.addEventListener('click', () => {
            this.elements.searchInput.value = '';
            this.searchQuery = '';
            this.filterAndDisplayLinks();
            this.updateClearButton();
        });

        // Filter buttons
        this.elements.filterBtns.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                this.setActiveFilter(btn.dataset.filter, index);
            });
        });

        // Links container event delegation
        this.elements.linksContainer.addEventListener('click', (e) => {
            this.handleLinkAction(e);
        });
    }

    updateClearButton() {
        if (this.searchQuery) {
            this.elements.clearSearch.classList.add('visible');
        } else {
            this.elements.clearSearch.classList.remove('visible');
        }
    }

    async loadLinks() {
        try {
            this.showLoading(true);
            this.allLinks = await StorageManager.getAllLinks();
            this.updateAllCounts();
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

        // Apply filter
        switch (this.currentFilter) {
            case 'recent':
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                filtered = filtered.filter(link =>
                    new Date(link.savedAt) > oneWeekAgo
                );
                break;
            case 'tagged':
                filtered = filtered.filter(link =>
                    link.tags && link.tags.length > 0
                );
                break;
        }

        // Apply search
        if (this.searchQuery) {
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

        this.filteredLinks = filtered;
        this.displayLinks();
    }

    displayLinks() {
        const container = this.elements.linksContainer;

        if (this.filteredLinks.length === 0) {
            container.style.display = 'none';
            this.elements.emptyState.style.display = 'flex';
            return;
        }

        container.style.display = 'block';
        this.elements.emptyState.style.display = 'none';

        container.innerHTML = this.filteredLinks
            .map(link => this.createLinkHTML(link))
            .join('');
    }

    createLinkHTML(link) {
        const formattedDate = this.formatDate(link.savedAt);
        const highlightedTitle = this.highlightSearchTerm(link.title);
        const highlightedQuote = this.highlightSearchTerm(link.selectedText);
        const favicon = this.getFaviconUrl(link.domain);

        const tagsHTML = link.tags && link.tags.length > 0
            ? `<div class="tags-container">
                ${link.tags.map(tag =>
                `<span class="tag">${this.highlightSearchTerm(tag)}</span>`
            ).join('')}
               </div>`
            : '';

        return `
            <div class="link-card" data-link-id="${link.id}">
                <div class="link-header">
                    <div class="link-info">
                        <div class="link-title">${highlightedTitle}</div>
                        <div class="link-meta">
                            <div class="link-domain">
                                <img src="${favicon}" alt="" class="domain-icon" onerror="this.style.display='none'">
                                ${link.domain}
                            </div>
                            <div class="link-date">${formattedDate}</div>
                        </div>
                    </div>
                    <div class="link-actions">
                        <button class="action-btn edit-tags" title="Edit tags" data-action="edit-tags">
                            🏷️
                        </button>
                        <button class="action-btn copy" title="Copy link" data-action="copy">
                            📋
                        </button>
                        <button class="action-btn delete" title="Delete" data-action="delete">
                            🗑️
                        </button>
                    </div>
                </div>
                
                <div class="link-quote">${highlightedQuote}</div>
                
                ${tagsHTML}
                
                <input type="text" class="tag-input" 
                       placeholder="Add tags (comma separated)..." 
                       value="${link.tags ? link.tags.join(', ') : ''}"
                       data-link-id="${link.id}">
            </div>
        `;
    }

    handleLinkAction(e) {
        const linkCard = e.target.closest('.link-card');
        if (!linkCard) return;

        const linkId = linkCard.dataset.linkId;
        const action = e.target.dataset.action;

        if (action) {
            e.stopPropagation();
            this.performAction(action, linkId, e.target);
            return;
        }

        // Handle tag input
        if (e.target.classList.contains('tag-input')) {
            return;
        }

        // Open link
        const link = this.allLinks.find(l => l.id === linkId);
        if (link) {
            chrome.tabs.create({ url: link.url });
        }
    }

    async performAction(action, linkId, element) {
        switch (action) {
            case 'edit-tags':
                this.editTags(linkId);
                break;
            case 'copy':
                await this.copyLink(linkId);
                break;
            case 'delete':
                await this.deleteLink(linkId);
                break;
        }
    }

    editTags(linkId) {
        const linkCard = document.querySelector(`[data-link-id="${linkId}"]`);
        const tagInput = linkCard.querySelector('.tag-input');

        tagInput.classList.add('active');
        tagInput.focus();
        tagInput.select();

        // Handle save on Enter or blur
        const saveHandler = () => this.saveTags(tagInput);
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                tagInput.classList.remove('active');
                tagInput.removeEventListener('blur', saveHandler);
                tagInput.removeEventListener('keydown', escapeHandler);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                saveHandler();
            }
        };

        tagInput.addEventListener('blur', saveHandler, { once: true });
        tagInput.addEventListener('keydown', escapeHandler);
    }

    async copyLink(linkId) {
        const link = this.allLinks.find(l => l.id === linkId);
        if (link) {
            try {
                await navigator.clipboard.writeText(link.url);
                this.showToast('Link copied to clipboard!');
            } catch (error) {
                console.error('Failed to copy link:', error);
                this.showToast('Failed to copy link', 'error');
            }
        }
    }

    async deleteLink(linkId) {
        if (!confirm('Are you sure you want to delete this link?')) {
            return;
        }

        try {
            await StorageManager.deleteLink(linkId);
            this.allLinks = this.allLinks.filter(link => link.id !== linkId);
            this.updateAllCounts();
            this.filterAndDisplayLinks();
            this.showToast('Link deleted successfully');
        } catch (error) {
            console.error('Error deleting link:', error);
            this.showToast('Failed to delete link', 'error');
        }
    }

    async saveTags(tagInput) {
        const linkId = tagInput.dataset.linkId;
        const tagsText = tagInput.value.trim();

        const tags = tagsText
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);

        try {
            await StorageManager.updateLinkTags(linkId, tags);

            const link = this.allLinks.find(l => l.id === linkId);
            if (link) {
                link.tags = tags;
            }

            tagInput.classList.remove('active');
            this.updateAllCounts();
            this.filterAndDisplayLinks();
            this.showToast('Tags updated successfully');
        } catch (error) {
            console.error('Error saving tags:', error);
            this.showToast('Failed to save tags', 'error');
        }
    }

    setActiveFilter(filter, index) {
        this.currentFilter = filter;

        // Update active state
        this.elements.filterBtns.forEach(btn => btn.classList.remove('active'));
        this.elements.filterBtns[index].classList.add('active');

        // Move indicator
        const indicatorWidth = 100 / this.elements.filterBtns.length;
        this.elements.filterIndicator.style.transform = `translateX(${index * 100}%)`;

        this.filterAndDisplayLinks();
    }

    updateAllCounts() {
        const total = this.allLinks.length;

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const recent = this.allLinks.filter(link =>
            new Date(link.savedAt) > oneWeekAgo
        ).length;

        const tagged = this.allLinks.filter(link =>
            link.tags && link.tags.length > 0
        ).length;

        // Update main counter
        this.elements.linkCount.querySelector('.count').textContent = total;

        // Update filter counters
        this.elements.allCount.textContent = total;
        this.elements.recentCount.textContent = recent;
        this.elements.taggedCount.textContent = tagged;
    }

    getFaviconUrl(domain) {
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
    }

    highlightSearchTerm(text) {
        if (!this.searchQuery.trim()) {
            return this.escapeHtml(text);
        }

        const escapedText = this.escapeHtml(text);
        const escapedQuery = this.escapeHtml(this.searchQuery);
        const regex = new RegExp(`(${escapedQuery})`, 'gi');

        return escapedText.replace(regex, '<span class="search-highlight">$1</span>');
    }

    showLoading(show) {
        this.elements.loading.style.display = show ? 'flex' : 'none';
        this.elements.linksContainer.style.display = show ? 'none' : 'block';
    }

    showToast(message, type = 'success') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        // Style the toast
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: type === 'error' ? '#ef4444' : '#10b981',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            zIndex: '1000',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 10);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

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
            return `${diffDays - 1} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LinkLibrarianPopup();
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.savedLinks) {
        window.location.reload();
    }
});