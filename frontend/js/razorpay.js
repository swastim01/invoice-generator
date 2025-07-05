// Razorpay Payment Integration
function initiatePayment() {
    const invoiceData = JSON.parse(localStorage.getItem('invoiceData'));
    
    const options = {
        key: 'rzp_test_your_key_here', // Replace with your Razorpay key
        amount: 900, // ₹9 in paise
        currency: 'INR',
        name: 'Invoice Generator',
        description: 'Professional Invoice PDF',
        image: 'https://your-logo-url.com/logo.png',
        order_id: 'order_' + Date.now(), // In real implementation, get from backend
        handler: function (response) {
            // Payment successful
            handlePaymentSuccess(response);
        },
        prefill: {
            name: invoiceData.businessName,
            email: invoiceData.businessEmail,
            contact: invoiceData.businessPhone
        },
        notes: {
            invoice_number: invoiceData.invoiceNumber,
            business_name: invoiceData.businessName
        },
        theme: {
            color: '#3B82F6'
        },
        modal: {
            ondismiss: function() {
                // Payment cancelled
                console.log('Payment cancelled');
            }
        }
    };

    const rzp = new Razorpay(options);
    rzp.on('payment.failed', function (response) {
        // Payment failed
        handlePaymentFailure(response);
    });

    rzp.open();
}

function handlePaymentSuccess(response) {
    // Store payment details
    const paymentData = {
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_signature: response.razorpay_signature,
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('paymentData', JSON.stringify(paymentData));
    
    // Redirect to success page
    window.location.href = 'success.html';
}

function handlePaymentFailure(response) {
    // Store failure details
    const failureData = {
        error: response.error,
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('paymentFailure', JSON.stringify(failureData));
    
    // Redirect to failure page
    window.location.href = 'fail.html';
}

function retryPayment() {
    localStorage.removeItem('paymentFailure');
    window.location.href = 'preview.html';
}

// Load payment data on success page
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('transactionId')) {
        const paymentData = JSON.parse(localStorage.getItem('paymentData') || '{}');
        const paymentDate = new Date(paymentData.timestamp).toLocaleString();
        
        document.getElementById('transactionId').textContent = paymentData.razorpay_payment_id || 'N/A';
        document.getElementById('paymentDate').textContent = paymentDate || 'N/A';
    }
});
