<template>
  <div class="seller-products">
    <!-- Header with actions -->
    <div class="products-header">
      <div class="header-info">
        <h3>Your Products</h3>
        <p>Manage your product catalog and inventory</p>
      </div>
      <div class="header-actions">
        <Button variant="outline" @click="exportProducts">
          <span>📊</span>
          Export
        </Button>
        <Button variant="primary" @click="$emit('addProduct')">
          <span>➕</span>
          Add Product
        </Button>
      </div>
    </div>

    <!-- Filters and Search -->
    <Card class="filters-card">
      <div class="filters-content">
        <div class="search-bar">
          <Input
            v-model="searchQuery"
            placeholder="Search products..."
            icon
          />
        </div>

        <div class="filter-selects">
          <select v-model="statusFilter" class="filter-select">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending Approval</option>
          </select>

          <select v-model="categoryFilter" class="filter-select">
            <option value="">All Categories</option>
            <option value="electronics">Electronics</option>
            <option value="fashion">Fashion</option>
            <option value="home">Home & Garden</option>
          </select>

          <select v-model="sortBy" class="filter-select">
            <option value="createdAt">Newest First</option>
            <option value="name">Name A-Z</option>
            <option value="price">Price Low-High</option>
            <option value="sales">Best Selling</option>
          </select>
        </div>
      </div>
    </Card>

    <!-- Products Table -->
    <Card class="products-table">
      <div class="table-container">
        <table class="products-table-content" v-if="!loading">
          <thead>
            <tr>
              <th>Product</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Sales</th>
              <th>Rating</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="product in filteredProducts" :key="product.id">
              <td class="product-cell">
                <div class="product-info">
                  <img
                    v-if="product.images && product.images[0]"
                    :src="product.images[0]"
                    :alt="product.name"
                    class="product-thumbnail"
                  />
                  <div v-else class="product-placeholder">📦</div>
                  <div class="product-details">
                    <div class="product-name">{{ product.name }}</div>
                    <div class="product-sku">SKU: {{ product.sku || 'N/A' }}</div>
                  </div>
                </div>
              </td>
              <td>{{ formatCurrency(product.price) }}</td>
              <td>
                <span class="stock-status" :class="getStockStatus(product.stock)">
                  {{ product.stock }}
                </span>
              </td>
              <td>
                <span class="status-badge" :class="product.status.toLowerCase()">
                  {{ product.status }}
                </span>
              </td>
              <td>{{ product.sales || 0 }}</td>
              <td>
                <div class="rating-display">
                  <span class="stars">
                    <span v-for="i in 5" :key="i" class="star" :class="{ filled: i <= Math.floor(product.rating) }">
                      ★
                    </span>
                  </span>
                  <span class="rating-number">({{ product.rating || 0 }})</span>
                </div>
              </td>
              <td>
                <div class="action-buttons">
                  <Button variant="outline" size="sm" @click="$emit('editProduct', product)">
                    ✏️
                  </Button>
                  <Button variant="outline" size="sm" @click="$emit('viewAnalytics', product)">
                    📊
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    @click="toggleProductStatus(product)"
                    :disabled="product.status === 'pending'"
                  >
                    {{ product.status === 'active' ? '🚫' : '✅' }}
                  </Button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Loading state -->
        <div v-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading products...</p>
        </div>

        <!-- Empty state -->
        <div v-if="!loading && filteredProducts.length === 0" class="empty-state">
          <div class="empty-icon">📦</div>
          <h3>No products found</h3>
          <p>You haven't added any products yet.</p>
          <Button variant="primary" @click="$emit('addProduct')">
            Add Your First Product
          </Button>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination">
        <Button
          variant="outline"
          size="sm"
          :disabled="currentPage === 1"
          @click="currentPage--"
        >
          Previous
        </Button>

        <span class="page-info">
          Page {{ currentPage }} of {{ totalPages }}
        </span>

        <Button
          variant="outline"
          size="sm"
          :disabled="currentPage === totalPages"
          @click="currentPage++"
        >
          Next
        </Button>
      </div>
    </Card>

    <!-- Bulk Actions -->
    <div v-if="selectedProducts.length > 0" class="bulk-actions">
      <Card>
        <div class="bulk-content">
          <span>{{ selectedProducts.length }} products selected</span>
          <div class="bulk-buttons">
            <Button variant="outline" @click="bulkActivate">
              ✅ Activate
            </Button>
            <Button variant="outline" @click="bulkDeactivate">
              🚫 Deactivate
            </Button>
            <Button variant="outline" @click="bulkDelete">
              🗑️ Delete
            </Button>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Card, Button, Input } from '@/components'
import sellerAPI, { SellerProduct } from '@/services/sellerAPI'

const searchQuery = ref('')
const statusFilter = ref('')
const categoryFilter = ref('')
const sortBy = ref('createdAt')
const currentPage = ref(1)
const selectedProducts = ref<string[]>([])

// Real data from API
const products = ref<SellerProduct[]>([])
const loading = ref(false)
const totalPages = ref(1)

const filteredProducts = computed(() => products.value)

const fetchProducts = async () => {
  loading.value = true
  try {
    const response = await sellerAPI.getProducts({
      page: currentPage.value,
      limit: 20,
      search: searchQuery.value || undefined,
      status: statusFilter.value || undefined,
      category: categoryFilter.value || undefined,
      sortBy: sortBy.value
    })

    products.value = response.products
    totalPages.value = response.pagination.totalPages
  } catch (error) {
    console.error('Failed to fetch products:', error)
    products.value = []
  } finally {
    loading.value = false
  }
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

const getStockStatus = (stock: number) => {
  if (stock === 0) return 'out-of-stock'
  if (stock < 10) return 'low-stock'
  return 'in-stock'
}

const toggleProductStatus = async (product: any) => {
  // API call to toggle product status
  console.log('Toggling status for product:', product.id)
}

const exportProducts = () => {
  // Export products to CSV
  console.log('Exporting products...')
}

const bulkActivate = () => {
  console.log('Bulk activating products...')
}

const bulkDeactivate = () => {
  console.log('Bulk deactivating products...')
}

const bulkDelete = () => {
  console.log('Bulk deleting products...')
}

onMounted(async () => {
  await fetchProducts()
})

// Watch for filter changes
watch([searchQuery, statusFilter, categoryFilter, sortBy], async () => {
  currentPage.value = 1
  await fetchProducts()
})

// Watch for page changes
watch(currentPage, async () => {
  await fetchProducts()
})
</script>

<style scoped>
.seller-products {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.products-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-info h3 {
  margin: 0 0 var(--spacing-xs) 0;
}

.header-info p {
  margin: 0;
  color: var(--text-secondary);
}

.header-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.filters-card {
  padding: var(--spacing-lg);
}

.filters-content {
  display: flex;
  gap: var(--spacing-lg);
  align-items: center;
}

.search-bar {
  flex: 1;
  max-width: 400px;
}

.filter-selects {
  display: flex;
  gap: var(--spacing-md);
}

.filter-select {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  background: white;
  min-width: 140px;
}

.products-table {
  padding: 0;
  overflow: hidden;
}

.table-container {
  overflow-x: auto;
}

.products-table-content {
  width: 100%;
  border-collapse: collapse;
}

.products-table-content th,
.products-table-content td {
  padding: var(--spacing-md);
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.products-table-content th {
  background-color: var(--bg-secondary);
  font-weight: 600;
  color: var(--text-primary);
  position: sticky;
  top: 0;
  z-index: 10;
}

.product-cell {
  min-width: 300px;
}

.product-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.product-thumbnail {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: var(--border-radius-md);
}

.product-placeholder {
  width: 50px;
  height: 50px;
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.product-details {
  flex: 1;
}

.product-name {
  font-weight: 500;
  margin-bottom: var(--spacing-xs);
}

.product-sku {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.stock-status {
  font-weight: 500;
}

.stock-status.in-stock {
  color: var(--success-color);
}

.stock-status.low-stock {
  color: var(--warning-color);
}

.stock-status.out-of-stock {
  color: var(--danger-color);
}

.status-badge {
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: uppercase;
}

.status-badge.active {
  background-color: #d1ecf1;
  color: #0c5460;
}

.status-badge.inactive {
  background-color: #f8d7da;
  color: #721c24;
}

.status-badge.pending {
  background-color: #fff3cd;
  color: #856404;
}

.rating-display {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.stars {
  font-size: 1rem;
}

.star {
  color: #ddd;
}

.star.filled {
  color: #ffd700;
}

.rating-number {
  font-size: 0.9rem;
  color: var(--text-muted);
}

.action-buttons {
  display: flex;
  gap: var(--spacing-xs);
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  border-top: 1px solid var(--border-color);
}

.page-info {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.bulk-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: var(--spacing-md);
}

.bulk-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
}

.bulk-buttons {
  display: flex;
  gap: var(--spacing-sm);
}

/* Responsive adjustments */
@media (max-width: 1024px) {
  .filters-content {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-selects {
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .products-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-md);
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .table-container {
    font-size: 0.9rem;
  }

  .product-cell {
    min-width: 250px;
  }

  .action-buttons {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .filters-content {
    gap: var(--spacing-sm);
  }

  .filter-selects {
    flex-direction: column;
    width: 100%;
  }

  .filter-select {
    width: 100%;
  }

  .bulk-content {
    flex-direction: column;
    gap: var(--spacing-sm);
    text-align: center;
  }

  .bulk-buttons {
    width: 100%;
    justify-content: center;
  }

  .loading-state {
    text-align: center;
    padding: var(--spacing-xl);
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid var(--bg-secondary);
    border-top: 4px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto var(--spacing-md);
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .empty-state {
    text-align: center;
    padding: var(--spacing-xl);
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: var(--spacing-md);
    opacity: 0.5;
  }

  .empty-state h3 {
    margin-bottom: var(--spacing-sm);
    color: var(--text-secondary);
  }

  .empty-state p {
    margin-bottom: var(--spacing-lg);
    color: var(--text-muted);
  }
}
</style>