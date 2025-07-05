// Invoice Generator App
class InvoiceGenerator {
    constructor() {
        this.invoiceData = {};
        this.items = [];
        this.init();
    }

    init() {
        // Set default invoice number and date
        const today = new Date();
        const invoiceNumber = 'INV-' + today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0') + '-' + String(Math.floor(Math.random() * 1000)).padStart(3, '0');
        
        if (document.getElementById('invoiceNumber')) {
            document.getElementById('invoiceNumber').value = invoiceNumber;
        }
        if (document.getElementById('invoiceDate')) {
            document.getElementById('invoiceDate').value = today.toISOString().split('T')[0];
        }

        // Add initial item
        this.addItem();
        
        // Bind events
        this.bindEvents();
        
        // Load existing data if on preview/success page
        this.loadInvoiceData();
    }

    bindEvents() {
        const form = document.getElementById('invoiceForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        const addItemBtn = document.getElementById('addItem');
        if (addItemBtn) {
            addItemBtn.addEventListener('click', () => this.addItem());
        }

        const taxRate = document.getElementById('taxRate');
        if (taxRate) {
            taxRate.addEventListener('input', () => this.calculateTotals());
        }
    }

    addItem() {
        const itemsList = document.getElementById('itemsList');
        if (!itemsList) return;

        const itemIndex = this.items.length;
        const itemDiv = document.createElement('div');
        itemDiv.className = 'border rounded-lg p-4 item-row';
        itemDiv.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div class="md:col-span-5">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input type="text" class="item-description w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                </div>
                <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input type="number" class="item-quantity w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" min="1" value="1" required>
                </div>
                <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Rate (₹)</label>
                    <input type="number" class="item-rate w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" min="0" step="0.01" required>
                </div>
                <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                    <input type="number" class="item-amount w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50" readonly>
                </div>
                <div class="md:col-span-1">
                    <button type="button" class="remove-item w-full bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600 transition-colors">
                        ✕
                    </button>
                </div>
            </div>
        `;

        itemsList.appendChild(itemDiv);
        this.items.push({});

        // Bind events for new item
        const quantityInput = itemDiv.querySelector('.item-quantity');
        const rateInput = itemDiv.querySelector('.item-rate');
        const removeBtn = itemDiv.querySelector('.remove-item');

        quantityInput.addEventListener('input', () => this.calculateItemAmount(itemDiv));
        rateInput.addEventListener('input', () => this.calculateItemAmount(itemDiv));
        removeBtn.addEventListener('click', () => this.removeItem(itemDiv));

        this.calculateTotals();
    }

    removeItem(itemDiv) {
        if (document.querySelectorAll('.item-row').length > 1) {
            itemDiv.remove();
            this.calculateTotals();
        }
    }

    calculateItemAmount(itemDiv) {
        const quantity = parseFloat(itemDiv.querySelector('.item-quantity').value) || 0;
        const rate = parseFloat(itemDiv.querySelector('.item-rate').value) || 0;
        const amount = quantity * rate;
        itemDiv.querySelector('.item-amount').value = amount.toFixed(2);
        this.calculateTotals();
    }

    calculateTotals() {
        const itemRows = document.querySelectorAll('.item-row');
        let subtotal = 0;

        itemRows.forEach(row => {
            const amount = parseFloat(row.querySelector('.item-amount').value) || 0;
            subtotal += amount;
        });

        const taxRate = parseFloat(document.getElementById('taxRate')?.value) || 0;
        const taxAmount = subtotal * (taxRate / 100);
        const total = subtotal + taxAmount;

        if (document.getElementById('subtotal')) {
            document.getElementById('subtotal').textContent = '₹' + subtotal.toFixed(2);
        }
        if (document.getElementById('taxAmount')) {
            document.getElementById('taxAmount').textContent = '₹' + taxAmount.toFixed(2);
        }
        if (document.getElementById('total')) {
            document.getElementById('total').textContent = '₹' + total.toFixed(2);
        }
    }

    handleSubmit(e) {
        e.preventDefault();
        
        // Collect form data
        const formData = new FormData(e.target);
        this.invoiceData = Object.fromEntries(formData);
        
        // Collect items
        this.invoiceData.items = [];
        const itemRows = document.querySelectorAll('.item-row');
        itemRows.forEach(row => {
            const description = row.querySelector('.item-description').value;
            const quantity = parseFloat(row.querySelector('.item-quantity').value);
            const rate = parseFloat(row.querySelector('.item-rate').value);
            const amount = parseFloat(row.querySelector('.item-amount').value);
            
            if (description && quantity && rate) {
                this.invoiceData.items.push({
                    description,
                    quantity,
                    rate,
                    amount
                });
            }
        });

        // Calculate totals
        const subtotal = this.invoiceData.items.reduce((sum, item) => sum + item.amount, 0);
        const taxRate = parseFloat(this.invoiceData.taxRate) || 0;
        const taxAmount = subtotal * (taxRate / 100);
        const total = subtotal + taxAmount;

        this.invoiceData.subtotal = subtotal;
        this.invoiceData.taxAmount = taxAmount;
        this.invoiceData.total = total;

        // Store in localStorage
        localStorage.setItem('invoiceData', JSON.stringify(this.invoiceData));

        // Redirect to preview
        window.location.href = 'preview.html';
    }

    loadInvoiceData() {
        const stored = localStorage.getItem('invoiceData');
        if (stored) {
            this.invoiceData = JSON.parse(stored);
            this.displayInvoicePreview();
        }
    }

    displayInvoicePreview() {
        const preview = document.getElementById('invoicePreview');
        if (!preview) return;

        const data = this.invoiceData;
        preview.innerHTML = `
            <div class="invoice-header mb-8">
                <div class="flex justify-between items-start">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-900">INVOICE</h1>
                        <p class="text-gray-600">${data.invoiceNumber}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-gray-600">Date: ${data.invoiceDate}</p>
                        ${data.dueDate ? `<p class="text-gray-600">Due: ${data.dueDate}</p>` : ''}
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                    <h3 class="font-semibold text-gray-900 mb-2">From:</h3>
                    <div class="text-gray-700">
                        <p class="font-medium">${data.businessName}</p>
                        <p class="whitespace-pre-line">${data.businessAddress}</p>
                        ${data.businessPhone ? `<p>Phone: ${data.businessPhone}</p>` : ''}
                        ${data.businessEmail ? `<p>Email: ${data.businessEmail}</p>` : ''}
                        ${data.businessGST ? `<p>GST: ${data.businessGST}</p>` : ''}
                    </div>
                </div>
                <div>
                    <h3 class="font-semibold text-gray-900 mb-2">To:</h3>
                    <div class="text-gray-700">
                        <p class="font-medium">${data.clientName}</p>
                        <p class="whitespace-pre-line">${data.clientAddress}</p>
                        ${data.clientEmail ? `<p>Email: ${data.clientEmail}</p>` : ''}
                    </div>
                </div>
            </div>

            <div class="mb-8">
                <table class="w-full border-collapse border border-gray-300">
                    <thead>
                        <tr class="bg-gray-50">
                            <th class="border border-gray-300 px-4 py-2 text-left">Description</th>
                            <th class="border border-gray-300 px-4 py-2 text-right">Qty</th>
                            <th class="border border-gray-300 px-4 py-2 text-right">Rate</th>
                            <th class="border border-gray-300 px-4 py-2 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.items.map(item => `
                            <tr>
                                <td class="border border-gray-300 px-4 py-2">${item.description}</td>
                                <td class="border border-gray-300 px-4 py-2 text-right">${item.quantity}</td>
                                <td class="border border-gray-300 px-4 py-2 text-right">₹${item.rate.toFixed(2)}</td>
                                <td class="border border-gray-300 px-4 py-2 text-right">₹${item.amount.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="flex justify-end">
                <div class="w-64">
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span>Subtotal:</span>
                            <span>₹${data.subtotal.toFixed(2)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Tax (${data.taxRate}%):</span>
                            <span>₹${data.taxAmount.toFixed(2)}</span>
                        </div>
                        <div class="flex justify-between font-bold text-lg border-t pt-2">
                            <span>Total:</span>
                            <span>₹${data.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// Utility functions
function goBack() {
    window.history.back();
}

function createNew() {
    localStorage.removeItem('invoiceData');
    window.location.href = 'index.html';
}

function downloadInvoice() {
    // In a real implementation, this would call the backend API
    // For now, we'll simulate the download
    const data = JSON.parse(localStorage.getItem('invoiceData'));
    
    // Create a temporary link to trigger download
    const link = document.createElement('a');
    link.href = '#'; // In real implementation, this would be the PDF URL from backend
    link.download = `invoice-${data.invoiceNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert('Invoice downloaded successfully!');
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    new InvoiceGenerator();
});
