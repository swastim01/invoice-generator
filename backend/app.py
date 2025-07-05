from flask import Flask, request, jsonify, send_file, render_template
from flask_cors import CORS
import os
import json
from datetime import datetime
import uuid
from utils.pdf_generator import PDFGenerator
import razorpay

app = Flask(__name__)
CORS(app)

# Configuration
app.config['SECRET_KEY'] = 'your-secret-key-here'
RAZORPAY_KEY_ID = 'rzp_test_your_key_here'
RAZORPAY_KEY_SECRET = 'your_secret_here'

# Initialize Razorpay client
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

# In-memory storage for demo (use database in production)
invoices = {}
payments = {}

@app.route('/')
def index():
    return {"message": "Invoice Generator API", "version": "1.0.0"}

@app.route('/api/generate-preview', methods=['POST'])
def generate_preview():
    try:
        data = request.json
        
        # Generate unique invoice ID
        invoice_id = str(uuid.uuid4())
        
        # Store invoice data
        invoices[invoice_id] = {
            'data': data,
            'created_at': datetime.now().isoformat(),
            'status': 'preview'
        }
        
        # Generate watermarked PDF
        pdf_generator = PDFGenerator()
        pdf_path = pdf_generator.generate_watermarked_pdf(data, invoice_id)
        
        return jsonify({
            'success': True,
            'invoice_id': invoice_id,
            'preview_url': f'/api/preview/{invoice_id}',
            'payment_url': f'/api/create-payment/{invoice_id}'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/preview/<invoice_id>')
def get_preview(invoice_id):
    if invoice_id not in invoices:
        return jsonify({'error': 'Invoice not found'}), 404
    
    pdf_path = f'temp/preview_{invoice_id}.pdf'
    if os.path.exists(pdf_path):
        return send_file(pdf_path, as_attachment=True, download_name=f'preview_{invoice_id}.pdf')
    else:
        return jsonify({'error': 'PDF not found'}), 404

@app.route('/api/create-payment/<invoice_id>', methods=['POST'])
def create_payment(invoice_id):
    try:
        if invoice_id not in invoices:
            return jsonify({'error': 'Invoice not found'}), 404
        
        # Create Razorpay order
        order_data = {
            'amount': 900,  # ₹9 in paise
            'currency': 'INR',
            'receipt': f'invoice_{invoice_id}',
            'notes': {
                'invoice_id': invoice_id,
                'purpose': 'Invoice PDF Download'
            }
        }
        
        order = razorpay_client.order.create(data=order_data)
        
        # Store payment data
        payments[order['id']] = {
            'invoice_id': invoice_id,
            'order_id': order['id'],
            'amount': 900,
            'status': 'created',
            'created_at': datetime.now().isoformat()
        }
        
        return jsonify({
            'success': True,
            'order_id': order['id'],
            'amount': 900,
            'currency': 'INR',
            'key_id': RAZORPAY_KEY_ID
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/verify-payment', methods=['POST'])
def verify_payment():
    try:
        data = request.json
        
        # Verify payment signature
        razorpay_client.utility.verify_payment_signature({
            'razorpay_order_id': data['razorpay_order_id'],
            'razorpay_payment_id': data['razorpay_payment_id'],
            'razorpay_signature': data['razorpay_signature']
        })
        
        # Update payment status
        order_id = data['razorpay_order_id']
        if order_id in payments:
            payments[order_id]['status'] = 'paid'
            payments[order_id]['payment_id'] = data['razorpay_payment_id']
            payments[order_id]['paid_at'] = datetime.now().isoformat()
            
            # Update invoice status
            invoice_id = payments[order_id]['invoice_id']
            if invoice_id in invoices:
                invoices[invoice_id]['status'] = 'paid'
                
                # Generate final PDF (without watermark)
                pdf_generator = PDFGenerator()
                final_pdf_path = pdf_generator.generate_final_pdf(
                    invoices[invoice_id]['data'], 
                    invoice_id
                )
                
                return jsonify({
                    'success': True,
                    'download_url': f'/api/download/{invoice_id}',
                    'invoice_id': invoice_id
                })
        
        return jsonify({'success': False, 'error': 'Payment verification failed'}), 400
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/download/<invoice_id>')
def download_invoice(invoice_id):
    if invoice_id not in invoices:
        return jsonify({'error': 'Invoice not found'}), 404
    
    if invoices[invoice_id]['status'] != 'paid':
        return jsonify({'error': 'Payment required'}), 403
    
    pdf_path = f'temp/final_{invoice_id}.pdf'
    if os.path.exists(pdf_path):
        invoice_data = invoices[invoice_id]['data']
        filename = f"invoice_{invoice_data.get('invoiceNumber', invoice_id)}.pdf"
        return send_file(pdf_path, as_attachment=True, download_name=filename)
    else:
        return jsonify({'error': 'PDF not found'}), 404

@app.route('/webhook/razorpay', methods=['POST'])
def razorpay_webhook():
    try:
        # Verify webhook signature
        webhook_secret = 'your_webhook_secret_here'
        webhook_signature = request.headers.get('X-Razorpay-Signature')
        webhook_body = request.get_data()
        
        razorpay_client.utility.verify_webhook_signature(
            webhook_body, webhook_signature, webhook_secret
        )
        
        # Process webhook event
        event = request.json
        
        if event['event'] == 'payment.captured':
            payment_id = event['payload']['payment']['entity']['id']
            order_id = event['payload']['payment']['entity']['order_id']
            
            # Update payment status
            if order_id in payments:
                payments[order_id]['status'] = 'captured'
                payments[order_id]['captured_at'] = datetime.now().isoformat()
        
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

if __name__ == '__main__':
    # Create temp directory for PDFs
    os.makedirs('temp', exist_ok=True)
    
    # Run development server
    app.run(debug=True, host='0.0.0.0', port=5000)
