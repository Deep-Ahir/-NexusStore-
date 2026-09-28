/**
 * NexusStore Client Application
 * Handles CRUD operations, live filtering, state, metrics, and modals
 */

// Application State
const state = {
    products: [],
    filteredProducts: [],
    searchQuery: '',
    selectedCategory: 'ALL',
    selectedBrand: 'ALL',
    sortBy: 'newest',
    viewMode: 'grid', // 'grid' or 'table'
    deleteTargetId: null,
    isSubmitting: false,
};

// DOM Element References
const elements = {
    // Status & Metrics
    dbStatusBadge: document.getElementById('dbStatusBadge'),
    dbStatusText: document.getElementById('dbStatusText'),
    statTotalProducts: document.getElementById('statTotalProducts'),
    statTotalValue: document.getElementById('statTotalValue'),
    statAvgPrice: document.getElementById('statAvgPrice'),
    statTotalBrands: document.getElementById('statTotalBrands'),
    resultsCountText: document.getElementById('resultsCountText'),

    // Containers
    productContainer: document.getElementById('productContainer'),
    productTableWrapper: document.getElementById('productTableWrapper'),
    productTableBody: document.getElementById('productTableBody'),
    emptyState: document.getElementById('emptyState'),
    emptyMessage: document.getElementById('emptyMessage'),
    categoryPillsContainer: document.getElementById('categoryPillsContainer'),
    toastContainer: document.getElementById('toastContainer'),

    // Controls
    searchInput: document.getElementById('searchInput'),
    btnClearSearch: document.getElementById('btnClearSearch'),
    brandSelect: document.getElementById('brandSelect'),
    sortSelect: document.getElementById('sortSelect'),
    viewGridBtn: document.getElementById('viewGridBtn'),
    viewTableBtn: document.getElementById('viewTableBtn'),
    btnRefresh: document.getElementById('btnRefresh'),
    btnSeedData: document.getElementById('btnSeedData'),
    btnEmptySeed: document.getElementById('btnEmptySeed'),
    btnEmptyReset: document.getElementById('btnEmptyReset'),

    // Modals
    productModal: document.getElementById('productModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalSubtitle: document.getElementById('modalSubtitle'),
    btnCloseModal: document.getElementById('btnCloseModal'),
    btnCancelModal: document.getElementById('btnCancelModal'),
    btnOpenCreateModal: document.getElementById('btnOpenCreateModal'),
    productForm: document.getElementById('productForm'),
    saveButtonText: document.getElementById('saveButtonText'),
    saveButtonSpinner: document.getElementById('saveButtonSpinner'),

    // Form inputs
    editProductId: document.getElementById('editProductId'),
    inputName: document.getElementById('inputName'),
    inputBrand: document.getElementById('inputBrand'),
    inputPrice: document.getElementById('inputPrice'),
    inputCategory: document.getElementById('inputCategory'),
    inputStock: document.getElementById('inputStock'),
    inputDescription: document.getElementById('inputDescription'),
    errorName: document.getElementById('errorName'),
    errorBrand: document.getElementById('errorBrand'),
    errorPrice: document.getElementById('errorPrice'),

    // Delete Modal
    deleteModal: document.getElementById('deleteModal'),
    deleteProductName: document.getElementById('deleteProductName'),
    btnCancelDelete: document.getElementById('btnCancelDelete'),
    btnConfirmDelete: document.getElementById('btnConfirmDelete'),
    deleteButtonSpinner: document.getElementById('deleteButtonSpinner'),
    deleteButtonText: document.getElementById('deleteButtonText'),
};

// API Base
const API_BASE = '';

/**
 * Toast Notification System
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    } else if (type === 'error') {
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else {
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `
        <span>${iconSvg}</span>
        <span style="flex:1;">${escapeHtml(message)}</span>
    `;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3800);
}

/**
 * Check backend and MongoDB connection status
 */
async function checkServerStatus() {
    try {
        const res = await fetch(`${API_BASE}/api/status`);
        if (!res.ok) throw new Error('Status endpoint failed');
        const data = await res.json();
        
        if (data.database === 'connected') {
            elements.dbStatusBadge.className = 'status-pill status-connected';
            elements.dbStatusText.textContent = `MongoDB: ${data.dbName}`;
            elements.dbStatusBadge.title = `Connected to MongoDB Atlas (${data.dbName})`;
        } else {
            elements.dbStatusBadge.className = 'status-pill status-disconnected';
            elements.dbStatusText.textContent = 'DB Disconnected';
        }
    } catch (err) {
        elements.dbStatusBadge.className = 'status-pill status-disconnected';
        elements.dbStatusText.textContent = 'API Offline';
    }
}

/**
 * Fetch all products from API
 */
async function fetchProducts() {
    renderLoadingSkeletons();
    try {
        const response = await fetch(`${API_BASE}/products`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        // Index.js returns { message: "Get all Product ", data: [...] }
        state.products = Array.isArray(result.data) ? result.data : [];
        updateBrandDropdown();
        applyFiltersAndSort();
        updateMetrics();
    } catch (error) {
        console.error('Failed to fetch products:', error);
        showToast('Failed to load products from server', 'error');
        renderEmptyState('Could not connect to the database. Ensure MongoDB is reachable.');
    }
}

/**
 * Update the brands dropdown options based on current database products
 */
function updateBrandDropdown() {
    const brands = [...new Set(state.products.map(p => p.brand).filter(Boolean))].sort();
    const currentVal = elements.brandSelect.value;
    
    elements.brandSelect.innerHTML = `<option value="ALL">All Brands (${brands.length})</option>`;
    brands.forEach(brand => {
        const option = document.createElement('option');
        option.value = brand;
        option.textContent = brand;
        elements.brandSelect.appendChild(option);
    });

    if (brands.includes(currentVal)) {
        elements.brandSelect.value = currentVal;
    } else {
        elements.brandSelect.value = 'ALL';
        state.selectedBrand = 'ALL';
    }
}

/**
 * Calculate and render top statistics cards
 */
function updateMetrics() {
    const totalCount = state.products.length;
    const totalVal = state.products.reduce((acc, p) => acc + (Number(p.price) || 0) * (Number(p.stock) || 1), 0);
    const avgPrice = totalCount > 0 ? (state.products.reduce((acc, p) => acc + (Number(p.price) || 0), 0) / totalCount) : 0;
    const uniqueBrands = new Set(state.products.map(p => p.brand).filter(Boolean)).size;

    elements.statTotalProducts.textContent = totalCount.toLocaleString();
    elements.statTotalValue.textContent = formatCurrency(totalVal);
    elements.statAvgPrice.textContent = formatCurrency(avgPrice);
    elements.statTotalBrands.textContent = uniqueBrands.toLocaleString();
}

/**
 * Filter and Sort Products
 */
function applyFiltersAndSort() {
    let list = [...state.products];

    // Filter by category
    if (state.selectedCategory !== 'ALL') {
        list = list.filter(p => (p.category || '').toLowerCase() === state.selectedCategory.toLowerCase());
    }

    // Filter by brand
    if (state.selectedBrand !== 'ALL') {
        list = list.filter(p => p.brand === state.selectedBrand);
    }

    // Filter by search query
    if (state.searchQuery.trim()) {
        const q = state.searchQuery.toLowerCase().trim();
        list = list.filter(p => 
            (p.name && p.name.toLowerCase().includes(q)) ||
            (p.brand && p.brand.toLowerCase().includes(q)) ||
            (p.category && p.category.toLowerCase().includes(q)) ||
            (p.description && p.description.toLowerCase().includes(q))
        );
    }

    // Sort
    switch (state.sortBy) {
        case 'price-asc':
            list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
            break;
        case 'price-desc':
            list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
            break;
        case 'name-asc':
            list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            break;
        case 'newest':
        default:
            list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            break;
    }

    state.filteredProducts = list;
    renderProductView();
}

/**
 * Render grid or table view depending on user selection
 */
function renderProductView() {
    const count = state.filteredProducts.length;
    elements.resultsCountText.textContent = `Showing ${count} of ${state.products.length} product${state.products.length === 1 ? '' : 's'}`;

    if (count === 0) {
        renderEmptyState();
        return;
    }

    elements.emptyState.classList.add('hidden');

    if (state.viewMode === 'grid') {
        elements.productContainer.classList.remove('hidden');
        elements.productTableWrapper.classList.add('hidden');
        renderGrid();
    } else {
        elements.productContainer.classList.add('hidden');
        elements.productTableWrapper.classList.remove('hidden');
        renderTable();
    }
}

/**
 * Render Grid Cards
 */
function renderGrid() {
    elements.productContainer.innerHTML = '';
    state.filteredProducts.forEach(product => {
        const card = document.createElement('article');
        card.className = 'product-card';
        card.setAttribute('data-id', product._id);

        const stock = Number(product.stock) || 0;
        let stockClass = 'stock-in';
        let stockText = `${stock} in stock`;
        if (stock === 0) {
            stockClass = 'stock-out';
            stockText = 'Out of Stock';
        } else if (stock <= 5) {
            stockClass = 'stock-low';
            stockText = `Low stock (${stock})`;
        }

        const category = product.category || 'Electronics';
        const description = product.description || 'Premium craftsmanship and performance for daily professional workflow.';

        card.innerHTML = `
            <div>
                <div class="product-card-top">
                    <span class="brand-badge">${escapeHtml(product.brand || 'Generic')}</span>
                    <span class="category-tag">${escapeHtml(category)}</span>
                </div>
                <h3 class="product-title">${escapeHtml(product.name)}</h3>
                <p class="product-description">${escapeHtml(description)}</p>
            </div>

            <div>
                <div class="product-card-meta">
                    <div class="price-container">
                        <span class="price-label">Price</span>
                        <span class="price-amount">${formatCurrency(product.price)}</span>
                    </div>
                    <span class="stock-badge ${stockClass}">
                        <span style="font-size: 8px;">●</span> ${stockText}
                    </span>
                </div>

                <div class="product-card-actions">
                    <button class="btn-card-action btn-card-edit" data-id="${product._id}" title="Edit product">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        <span>Edit</span>
                    </button>
                    <button class="btn-card-action btn-card-delete" data-id="${product._id}" data-name="${escapeHtml(product.name)}" title="Delete product">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        <span>Delete</span>
                    </button>
                </div>
            </div>
        `;

        elements.productContainer.appendChild(card);
    });

    attachCardActionListeners();
}

/**
 * Render Table View
 */
function renderTable() {
    elements.productTableBody.innerHTML = '';
    state.filteredProducts.forEach(product => {
        const tr = document.createElement('tr');
        const stock = Number(product.stock) || 0;
        let stockClass = 'stock-in';
        let stockText = `${stock} in stock`;
        if (stock === 0) {
            stockClass = 'stock-out';
            stockText = 'Out of Stock';
        } else if (stock <= 5) {
            stockClass = 'stock-low';
            stockText = `Low (${stock})`;
        }

        tr.innerHTML = `
            <td>
                <div class="table-product-cell">
                    <span class="table-product-name">${escapeHtml(product.name)}</span>
                    <span class="table-product-desc">${escapeHtml(product.description || 'No description provided')}</span>
                </div>
            </td>
            <td><span class="brand-badge">${escapeHtml(product.brand)}</span></td>
            <td><span class="category-tag">${escapeHtml(product.category || 'General')}</span></td>
            <td style="font-family: var(--font-mono); font-weight: 700; color: #38bdf8;">${formatCurrency(product.price)}</td>
            <td><span class="stock-badge ${stockClass}">${stockText}</span></td>
            <td style="color: #fbbf24;">★ ${Number(product.rating || 4.8).toFixed(1)}</td>
            <td class="text-right">
                <div class="table-actions">
                    <button class="btn-card-action btn-card-edit" data-id="${product._id}" title="Edit">
                        Edit
                    </button>
                    <button class="btn-card-action btn-card-delete" data-id="${product._id}" data-name="${escapeHtml(product.name)}" title="Delete">
                        Delete
                    </button>
                </div>
            </td>
        `;
        elements.productTableBody.appendChild(tr);
    });

    attachCardActionListeners();
}

/**
 * Event listeners for Edit and Delete buttons on cards / table rows
 */
function attachCardActionListeners() {
    document.querySelectorAll('.btn-card-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            openEditModal(id);
        });
    });

    document.querySelectorAll('.btn-card-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const name = e.currentTarget.getAttribute('data-name');
            openDeleteModal(id, name);
        });
    });
}

/**
 * Render loading skeleton placeholders
 */
function renderLoadingSkeletons() {
    elements.emptyState.classList.add('hidden');
    elements.productTableWrapper.classList.add('hidden');
    elements.productContainer.classList.remove('hidden');
    elements.productContainer.innerHTML = `
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
    `;
}

/**
 * Render empty state
 */
function renderEmptyState(customMsg) {
    elements.productContainer.classList.add('hidden');
    elements.productTableWrapper.classList.add('hidden');
    elements.emptyState.classList.remove('hidden');

    if (customMsg) {
        elements.emptyMessage.textContent = customMsg;
    } else if (state.products.length === 0) {
        elements.emptyMessage.textContent = 'Your catalog is currently empty. Click "Load Sample Inventory" to instantly populate sample products!';
    } else {
        elements.emptyMessage.textContent = `No products matching your search or filters. Try adjusting your search query or reset filters.`;
    }
}

/**
 * Open Create Modal
 */
function openCreateModal() {
    clearFormErrors();
    elements.productForm.reset();
    elements.editProductId.value = '';
    elements.modalTitle.textContent = 'Add New Product';
    elements.modalSubtitle.textContent = 'Fill in product info to store in MongoDB Atlas';
    elements.saveButtonText.textContent = 'Create Product';
    elements.productModal.classList.remove('hidden');
    elements.inputName.focus();
}

/**
 * Open Edit Modal
 */
function openEditModal(id) {
    const product = state.products.find(p => p._id === id);
    if (!product) return;

    clearFormErrors();
    elements.editProductId.value = product._id;
    elements.inputName.value = product.name || '';
    elements.inputBrand.value = product.brand || '';
    elements.inputPrice.value = product.price !== undefined ? product.price : '';
    elements.inputCategory.value = product.category || 'Electronics';
    elements.inputStock.value = product.stock !== undefined ? product.stock : 10;
    elements.inputDescription.value = product.description || '';

    elements.modalTitle.textContent = 'Edit Product';
    elements.modalSubtitle.textContent = `Updating item ID: ${product._id.slice(-6)}`;
    elements.saveButtonText.textContent = 'Update Changes';
    elements.productModal.classList.remove('hidden');
    elements.inputName.focus();
}

/**
 * Close Modal
 */
function closeModal() {
    elements.productModal.classList.add('hidden');
    elements.productForm.reset();
    elements.editProductId.value = '';
    clearFormErrors();
}

/**
 * Clear form validation errors
 */
function clearFormErrors() {
    elements.errorName.textContent = '';
    elements.errorBrand.textContent = '';
    elements.errorPrice.textContent = '';
}

/**
 * Validate form fields
 */
function validateForm() {
    clearFormErrors();
    let isValid = true;

    if (!elements.inputName.value.trim()) {
        elements.errorName.textContent = 'Product name is required';
        isValid = false;
    }

    if (!elements.inputBrand.value.trim()) {
        elements.errorBrand.textContent = 'Brand name is required';
        isValid = false;
    }

    const priceVal = parseFloat(elements.inputPrice.value);
    if (isNaN(priceVal) || priceVal < 0) {
        elements.errorPrice.textContent = 'Please enter a valid positive price';
        isValid = false;
    }

    return isValid;
}

/**
 * Handle Create / Update Form Submission
 */
async function handleProductFormSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    const id = elements.editProductId.value;
    const isEdit = Boolean(id);

    const payload = {
        name: elements.inputName.value.trim(),
        brand: elements.inputBrand.value.trim(),
        price: parseFloat(elements.inputPrice.value),
        category: elements.inputCategory.value,
        stock: parseInt(elements.inputStock.value, 10) || 0,
        description: elements.inputDescription.value.trim()
    };

    setSubmitLoading(true);

    try {
        const url = isEdit ? `${API_BASE}/products/${id}` : `${API_BASE}/products`;
        const method = isEdit ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || 'Operation failed');
        }

        const data = await res.json();
        showToast(isEdit ? 'Product updated successfully!' : 'New product created successfully!', 'success');
        closeModal();
        await fetchProducts();
    } catch (err) {
        console.error('Save product error:', err);
        showToast(err.message || 'Failed to save product', 'error');
    } finally {
        setSubmitLoading(false);
    }
}

function setSubmitLoading(loading) {
    state.isSubmitting = loading;
    if (loading) {
        elements.saveButtonSpinner.classList.remove('hidden');
        elements.saveButtonText.textContent = 'Saving...';
    } else {
        elements.saveButtonSpinner.classList.add('hidden');
        elements.saveButtonText.textContent = elements.editProductId.value ? 'Update Changes' : 'Create Product';
    }
}

/**
 * Delete Modal Flow
 */
function openDeleteModal(id, name) {
    state.deleteTargetId = id;
    elements.deleteProductName.textContent = `"${name}"`;
    elements.deleteModal.classList.remove('hidden');
}

function closeDeleteModal() {
    state.deleteTargetId = null;
    elements.deleteModal.classList.add('hidden');
}

async function confirmDeleteProduct() {
    if (!state.deleteTargetId) return;

    elements.deleteButtonSpinner.classList.remove('hidden');
    elements.deleteButtonText.textContent = 'Deleting...';

    try {
        const res = await fetch(`${API_BASE}/products/${state.deleteTargetId}`, {
            method: 'DELETE'
        });

        if (!res.ok) {
            throw new Error('Failed to delete product from database');
        }

        showToast('Product successfully removed from database', 'success');
        closeDeleteModal();
        await fetchProducts();
    } catch (err) {
        console.error('Delete error:', err);
        showToast(err.message || 'Error deleting product', 'error');
    } finally {
        elements.deleteButtonSpinner.classList.add('hidden');
        elements.deleteButtonText.textContent = 'Delete Permanently';
    }
}

/**
 * Seed Sample Data
 */
async function seedSampleProducts() {
    showToast('Seeding realistic catalog to MongoDB Atlas...', 'info');
    try {
        const res = await fetch(`${API_BASE}/products/seed?force=true`, {
            method: 'POST'
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.message || 'Seeding failed');
        
        showToast('Sample products loaded successfully!', 'success');
        await fetchProducts();
    } catch (err) {
        console.error('Seeding error:', err);
        showToast(err.message || 'Failed to seed sample data', 'error');
    }
}

/**
 * Format number into USD currency string
 */
function formatCurrency(num) {
    const val = Number(num) || 0;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: val % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2
    }).format(val);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Initialize Event Listeners
 */
function initEventListeners() {
    // Search input
    let searchTimeout;
    elements.searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            state.searchQuery = e.target.value;
            elements.btnClearSearch.classList.toggle('hidden', !state.searchQuery);
            applyFiltersAndSort();
        }, 150);
    });

    elements.btnClearSearch.addEventListener('click', () => {
        elements.searchInput.value = '';
        state.searchQuery = '';
        elements.btnClearSearch.classList.add('hidden');
        applyFiltersAndSort();
        elements.searchInput.focus();
    });

    // Category pills
    elements.categoryPillsContainer.addEventListener('click', (e) => {
        const pill = e.target.closest('.pill-chip');
        if (!pill) return;

        document.querySelectorAll('.pill-chip').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        state.selectedCategory = pill.getAttribute('data-category');
        applyFiltersAndSort();
    });

    // Brand Select
    elements.brandSelect.addEventListener('change', (e) => {
        state.selectedBrand = e.target.value;
        applyFiltersAndSort();
    });

    // Sort Select
    elements.sortSelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        applyFiltersAndSort();
    });

    // View mode toggle
    elements.viewGridBtn.addEventListener('click', () => {
        state.viewMode = 'grid';
        elements.viewGridBtn.classList.add('active');
        elements.viewTableBtn.classList.remove('active');
        renderProductView();
    });

    elements.viewTableBtn.addEventListener('click', () => {
        state.viewMode = 'table';
        elements.viewTableBtn.classList.add('active');
        elements.viewGridBtn.classList.remove('active');
        renderProductView();
    });

    // Refresh & Seed
    elements.btnRefresh.addEventListener('click', () => {
        showToast('Refreshing products...', 'info');
        fetchProducts();
        checkServerStatus();
    });

    elements.btnSeedData.addEventListener('click', seedSampleProducts);
    elements.btnEmptySeed.addEventListener('click', seedSampleProducts);

    elements.btnEmptyReset.addEventListener('click', () => {
        elements.searchInput.value = '';
        state.searchQuery = '';
        elements.btnClearSearch.classList.add('hidden');
        elements.brandSelect.value = 'ALL';
        state.selectedBrand = 'ALL';
        state.selectedCategory = 'ALL';
        document.querySelectorAll('.pill-chip').forEach(p => {
            p.classList.toggle('active', p.getAttribute('data-category') === 'ALL');
        });
        applyFiltersAndSort();
    });

    // Modal Triggers
    elements.btnOpenCreateModal.addEventListener('click', openCreateModal);
    elements.btnCloseModal.addEventListener('click', closeModal);
    elements.btnCancelModal.addEventListener('click', closeModal);
    elements.productForm.addEventListener('submit', handleProductFormSubmit);

    // Delete Modal triggers
    elements.btnCancelDelete.addEventListener('click', closeDeleteModal);
    elements.btnConfirmDelete.addEventListener('click', confirmDeleteProduct);

    // Close modals on escape key or backdrop click
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeDeleteModal();
        }
    });

    elements.productModal.addEventListener('click', (e) => {
        if (e.target === elements.productModal) closeModal();
    });

    elements.deleteModal.addEventListener('click', (e) => {
        if (e.target === elements.deleteModal) closeDeleteModal();
    });
}

// App Initialization
async function initApp() {
    initEventListeners();
    await checkServerStatus();
    await fetchProducts();

    // Check status periodically every 30 seconds
    setInterval(checkServerStatus, 30000);
}

document.addEventListener('DOMContentLoaded', initApp);
