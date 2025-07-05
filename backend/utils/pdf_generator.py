import weasyprint
from jinja2 import Template
import os
from datetime import datetime

class PDFGenerator:
    def __init__(self):
        self.template_path = 'templates/invoice_template.html'
    
    def generate_watermarked_pdf(self, data, invoice_id):
        """Generate PDF with watermark"""
        html_content = self._render_template(data, watermark=True)
        pdf_path = f'temp/preview_{invoice_id}.pdf'
        
        # Generate PDF
        weasyprint.HTML(string=html_content).write_pdf(pdf_path)
        
        return pdf_path
    
    def generate_final_pdf(self, data, invoice_id):
        """Generate final PDF without watermark"""
        html_content = self._render_template(data, watermark=False)
        pdf_path = f'temp/final_{invoice_id}.pdf'
        
        # Generate PDF
        weasyprint.HTML(string=html_content).write_pdf(pdf_path)
        
        return pdf_path
    
    def _render_template(self, data, watermark=False):
        """Render HTML template with invoice data"""
        
        # Read template
        with open(self.template_path, 'r', encoding='utf-8') as f:
            template_content = f.read()
        
        template = Template(template_content)
        
        # Prepare template variables
        template_vars = {
            'invoice': data,
            'watermark': watermark,
            'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        # Render template
        html_content = template.render(**template_vars)
        
        return html_content
