document.addEventListener('DOMContentLoaded', function() {
    // Initialize sidebar toggle
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const mainContent = document.getElementById('mainContent');
    
    // Toggle sidebar
    sidebarToggle.addEventListener('click', function() {
        sidebar.classList.toggle('collapsed');
        updateSidebarState();
    });
    
    // Mobile sidebar toggle
    function updateSidebarState() {
        const isCollapsed = sidebar.classList.contains('collapsed');
        localStorage.setItem('sidebarCollapsed', isCollapsed);
        
        // Update toggle icon
        const icon = sidebarToggle.querySelector('i');
        if (isCollapsed) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-chevron-right');
        } else {
            icon.classList.remove('fa-chevron-right');
            icon.classList.add('fa-bars');
        }
    }
    
    // Restore sidebar state
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState === 'true') {
        sidebar.classList.add('collapsed');
        updateSidebarState();
    }
    
    // Navigation
    document.querySelectorAll('.menu-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links
            document.querySelectorAll('.menu-link').forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Get target section
            const target = this.getAttribute('href').substring(1);
            showSection(target);
        });
    });
    
    // Load initial data
    loadDashboard();
    loadCategories();
    loadUnits();
    
    // Add Item Form
    document.getElementById('addItemForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        // Show loading state
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Saving...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch('/api/inventory/items', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                showNotification('Item added successfully!', 'success');
                
                // Close modal
                bootstrap.Modal.getInstance(document.getElementById('addItemModal')).hide();
                
                // Reset form
                this.reset();
                document.getElementById('imagePreview').innerHTML = '';
                
                // Reload inventory
                if (document.getElementById('inventorySection').classList.contains('d-none') === false) {
                    loadInventory();
                }
                
                // Update dashboard
                loadDashboard();
            } else {
                const error = await response.json();
                showNotification('Error: ' + error.error, 'error');
            }
        } catch (error) {
            showNotification('Error: ' + error.message, 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
    
    // Image preview
    document.getElementById('imageUpload').addEventListener('change', function(e) {
        const preview = document.getElementById('imagePreview');
        preview.innerHTML = '';
        
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'img-thumbnail';
                preview.appendChild(img);
            };
            reader.readAsDataURL(this.files[0]);
        }
    });
    
    // Add Item button in navbar
    document.getElementById('addItemBtn').addEventListener('click', function() {
        const modal = new bootstrap.Modal(document.getElementById('addItemModal'));
        modal.show();
    });
});

function showSection(sectionId) {
    // Hide all sections
    document.getElementById('statsSection').classList.remove('d-none');
    document.getElementById('inventorySection').classList.add('d-none');
    document.getElementById('ordersSection').classList.add('d-none');
    
    // Show selected section
    switch(sectionId) {
        case 'dashboard':
            document.getElementById('statsSection').classList.remove('d-none');
            loadDashboard();
            updatePageTitle('Dashboard Overview');
            break;
        case 'inventory':
            document.getElementById('inventorySection').classList.remove('d-none');
            loadInventory();
            updatePageTitle('Inventory Management');
            break;
        case 'orders':
            document.getElementById('ordersSection').classList.remove('d-none');
            loadOrders();
            updatePageTitle('Order Management');
            break;
    }
}

function updatePageTitle(title) {
    const pageTitle = document.querySelector('.page-title h4');
    if (pageTitle) {
        pageTitle.textContent = title;
    }
}

async function loadDashboard() {
    try {
        // Fetch dashboard stats
        const response = await fetch('/api/admin/dashboard');
        const data = await response.json();
        
        // Update stats
        document.getElementById('totalItems').textContent = data.totalItems || '0';
        document.getElementById('lowStockCount').textContent = data.lowStock || '0';
        document.getElementById('todayOrders').textContent = data.todayOrders || '0';
        document.getElementById('totalSales').textContent = '$' + (data.totalSales || '0');
        
        // Update badges
        document.getElementById('lowStockBadge').textContent = data.lowStock || '0';
        document.getElementById('pendingOrdersBadge').textContent = data.pendingOrders || '0';
        
        // Load recent orders
        await loadRecentOrders();
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showNotification('Failed to load dashboard data', 'error');
    }
}

async function loadRecentOrders() {
    try {
        const response = await fetch('/api/admin/orders?limit=5');
        const orders = await response.json();
        
        const tbody = document.querySelector('#recentOrdersTable tbody');
        tbody.innerHTML = '';
        
        if (orders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        <i class="fas fa-shopping-cart fa-2x mb-3 d-block"></i>
                        No recent orders found
                    </td>
                </tr>
            `;
            return;
        }
        
        orders.forEach(order => {
            const date = new Date(order.order_date).toLocaleDateString();
            const statusBadge = getStatusBadge(order.status);
            
            const row = `
                <tr>
                    <td><strong>#${order.id}</strong></td>
                    <td>
                        <div>${order.customer_name || 'N/A'}</div>
                        <small class="text-muted">${order.customer_phone || ''}</small>
                    </td>
                    <td>$${order.total_amount || '0.00'}</td>
                    <td>
                        <span class="badge ${statusBadge.class}">${statusBadge.text}</span>
                    </td>
                    <td>${date}</td>
                    <td>
                        <select class="form-select form-select-sm" onchange="updateOrderStatus(${order.id}, this.value)">
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                            <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>Preparing</option>
                            <option value="delivering" ${order.status === 'delivering' ? 'selected' : ''}>Delivering</option>
                            <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </td>
                </tr>
            `;
            
            tbody.innerHTML += row;
        });
        
    } catch (error) {
        console.error('Error loading recent orders:', error);
    }
}

async function loadInventory() {
    try {
        const response = await fetch('/api/inventory/items');
        const items = await response.json();
        
        const tbody = document.querySelector('#inventoryTable tbody');
        tbody.innerHTML = '';
        
        if (items.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">
                        <i class="fas fa-box fa-2x mb-3 d-block"></i>
                        No inventory items found
                    </td>
                </tr>
            `;
            return;
        }
        
        items.forEach(item => {
            const isLowStock = item.min_stock_level && item.in_stock <= item.min_stock_level;
            const stockClass = isLowStock ? 'text-danger' : 'text-success';
            
            const row = `
                <tr>
                    <td>
                        ${item.image_url ? 
                          `<img src="${item.image_url}" alt="${item.name}" class="rounded" style="width: 50px; height: 50px; object-fit: cover;">` :
                          `<div class="bg-light rounded d-flex align-items-center justify-content-center" style="width: 50px; height: 50px;">
                               <i class="fas fa-image text-muted"></i>
                           </div>`}
                    </td>
                    <td>
                        <strong>${item.name}</strong>
                        ${item.description ? `<br><small class="text-muted">${item.description.substring(0, 50)}...</small>` : ''}
                    </td>
                    <td>${item.category_name || 'Uncategorized'}</td>
                    <td>$${item.price}</td>
                    <td class="${stockClass}">
                        <strong>${item.in_stock}</strong> ${item.unit_symbol}
                        ${isLowStock ? '<br><small class="text-danger">Low Stock!</small>' : ''}
                    </td>
                    <td>
                        <span class="badge ${item.is_available ? 'bg-success' : 'bg-secondary'}">
                            ${item.is_available ? 'Available' : 'Unavailable'}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-warning me-2" onclick="editItem(${item.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteItem(${item.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            
            tbody.innerHTML += row;
        });
        
    } catch (error) {
        console.error('Error loading inventory:', error);
        showNotification('Failed to load inventory', 'error');
    }
}

async function loadOrders() {
    try {
        const response = await fetch('/api/admin/orders');
        const orders = await response.json();
        
        const tbody = document.querySelector('#ordersTable tbody');
        tbody.innerHTML = '';
        
        if (orders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        <i class="fas fa-shopping-cart fa-2x mb-3 d-block"></i>
                        No orders found
                    </td>
                </tr>
            `;
            return;
        }
        
        orders.forEach(order => {
            const date = new Date(order.order_date).toLocaleDateString();
            const statusBadge = getStatusBadge(order.status);
            
            const row = `
                <tr>
                    <td><strong>#${order.id}</strong></td>
                    <td>
                        <div>${order.customer_name || 'N/A'}</div>
                        <small class="text-muted">${order.customer_phone || ''}</small>
                    </td>
                    <td>$${order.total_amount || '0.00'}</td>
                    <td>
                        <span class="badge ${statusBadge.class}">${statusBadge.text}</span>
                    </td>
                    <td>${date}</td>
                    <td>
                        <select class="form-select form-select-sm" onchange="updateOrderStatus(${order.id}, this.value)">
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                            <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>Preparing</option>
                            <option value="delivering" ${order.status === 'delivering' ? 'selected' : ''}>Delivering</option>
                            <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </td>
                </tr>
            `;
            
            tbody.innerHTML += row;
        });
        
    } catch (error) {
        console.error('Error loading orders:', error);
        showNotification('Failed to load orders', 'error');
    }
}

async function loadCategories() {
    try {
        const response = await fetch('/api/inventory/categories');
        const categories = await response.json();
        
        const select = document.getElementById('categorySelect');
        select.innerHTML = '<option value="">Select Category</option>';
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function loadUnits() {
    try {
        const response = await fetch('/api/inventory/units');
        const units = await response.json();
        
        const select = document.getElementById('unitSelect');
        select.innerHTML = '<option value="">Select Unit</option>';
        
        units.forEach(unit => {
            const option = document.createElement('option');
            option.value = unit.id;
            option.textContent = `${unit.name} (${unit.symbol})`;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading units:', error);
    }
}

function getStatusBadge(status) {
    const badges = {
        'pending': { class: 'bg-warning', text: 'Pending' },
        'confirmed': { class: 'bg-info', text: 'Confirmed' },
        'preparing': { class: 'bg-primary', text: 'Preparing' },
        'delivering': { class: 'bg-success', text: 'Delivering' },
        'completed': { class: 'bg-success', text: 'Completed' },
        'cancelled': { class: 'bg-danger', text: 'Cancelled' }
    };
    
    return badges[status] || { class: 'bg-secondary', text: status };
}

async function updateOrderStatus(orderId, status) {
    try {
        const response = await fetch(`/api/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            showNotification('Order status updated successfully!', 'success');
            
            // Reload orders if on orders page
            if (!document.getElementById('ordersSection').classList.contains('d-none')) {
                loadOrders();
            }
            
            // Reload recent orders if on dashboard
            if (!document.getElementById('statsSection').classList.contains('d-none')) {
                loadRecentOrders();
            }
        } else {
            showNotification('Failed to update order status', 'error');
        }
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    }
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.custom-notification');
    existingNotifications.forEach(notification => {
        notification.remove();
    });
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `custom-notification alert alert-${type} alert-dismissible fade show`;
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Style notification
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    notification.style.maxWidth = '350px';
    notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    
    // Add to body
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

// Global functions for edit and delete
async function editItem(itemId) {
    // Implement edit functionality
    showNotification('Edit functionality coming soon!', 'info');
}

async function deleteItem(itemId) {
    if (confirm('Are you sure you want to delete this item?')) {
        try {
            const response = await fetch(`/api/inventory/items/${itemId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                showNotification('Item deleted successfully!', 'success');
                loadInventory();
                loadDashboard();
            } else {
                showNotification('Failed to delete item', 'error');
            }
        } catch (error) {
            showNotification('Error: ' + error.message, 'error');
        }
    }
}
