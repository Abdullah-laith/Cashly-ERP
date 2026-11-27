'use client';

export type PrintableInvoiceLine = {
  name: string;
  qty: number;
  price: number;
};

export type PrintableInvoiceData = {
  invoiceNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerType: 'online' | 'in_store';
  paymentType: 'cash' | 'credit';
  lines: PrintableInvoiceLine[];
  subtotal: number;
  discount: number;
  discountMode: 'amount' | 'percent';
  shipping: number;
  total: number;
  currency: 'IQD' | 'USD';
};

type PrintableInvoiceProps = {
  invoice: PrintableInvoiceData;
  organization: {
    business_name?: string;
    logo_url?: string;
    business_phone?: string;
    business_address?: string;
  };
};

const formatMoney = (value: number, currency: 'IQD' | 'USD') =>
  `${value.toLocaleString('ar-IQ')} ${currency === 'IQD' ? 'د.ع' : '$'}`;

export default function PrintableInvoice({ invoice, organization }: PrintableInvoiceProps) {
  const customerType = invoice.customerType === 'online' ? 'أونلاين' : 'زيارة للمحل';
  const paymentType = invoice.paymentType === 'credit' ? 'آجل' : 'نقدي';
  const date = new Date(invoice.createdAt);

  return (
    <article id="printable-invoice" dir="rtl" className="print-invoice print-only" aria-label="فاتورة بيع">
      <header className="print-invoice-header">
        <div className="print-company">
          {organization.logo_url && <img src={organization.logo_url} alt="شعار الشركة" className="print-logo" />}
          <div>
            <h1>{organization.business_name || 'Cashly'}</h1>
            {organization.business_phone && <p>{organization.business_phone}</p>}
            {organization.business_address && <p>{organization.business_address}</p>}
          </div>
        </div>
        <div className="print-invoice-meta">
          <p className="print-invoice-title">فاتورة بيع</p>
          <p>رقم الفاتورة: <strong>{invoice.invoiceNumber}</strong></p>
          <p>التاريخ والوقت: {date.toLocaleString('ar-IQ')}</p>
          <p>حالة الدفع: <strong>{paymentType}</strong></p>
        </div>
      </header>

      <section className="print-customer-box">
        <div><span>الزبون</span><strong>{invoice.customerName || 'عميل نقدي'}</strong></div>
        <div><span>الهاتف</span><strong>{invoice.customerPhone || '—'}</strong></div>
        <div><span>المحافظة / المنطقة</span><strong>{invoice.customerAddress || '—'}</strong></div>
        <div><span>نوع الزبون</span><strong>{customerType}</strong></div>
      </section>

      <table className="print-invoice-table">
        <thead><tr><th>ت</th><th>اسم المنتج</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead>
        <tbody>{invoice.lines.map((line, index) => <tr key={`${line.name}-${index}`}><td>{index + 1}</td><td>{line.name}</td><td>{line.qty}</td><td>{formatMoney(line.price, invoice.currency)}</td><td>{formatMoney(line.price * line.qty, invoice.currency)}</td></tr>)}</tbody>
      </table>

      <section className="print-total-box">
        <div><span>المجموع الفرعي</span><strong>{formatMoney(invoice.subtotal, invoice.currency)}</strong></div>
        <div><span>الخصم ({invoice.discountMode === 'percent' ? `${invoice.discount}%` : 'مبلغ ثابت'})</span><strong>{formatMoney(invoice.discount, invoice.currency)}</strong></div>
        <div><span>أجور التوصيل</span><strong>{formatMoney(invoice.shipping, invoice.currency)}</strong></div>
        <div className="print-grand-total"><span>الإجمالي النهائي الصافي</span><strong>{formatMoney(invoice.total, invoice.currency)}</strong></div>
      </section>

      <footer className="print-invoice-footer">
        <div className="print-signature-box"><strong>ختم وتوقيع الشركة</strong><span /></div>
        <div className="print-signature-box"><strong>توقيع المستلم / الزبون</strong><span /></div>
        <p>شكراً لتعاملكم معنا، نتمنى لكم تجربة تسوق سعيدة.</p>
      </footer>
    </article>
  );
}
