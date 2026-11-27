'use client';

export type InvoiceLine = {
  name: string;
  qty: number;
  price: number;
};

export type InvoiceData = {
  invoiceNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerType: 'online' | 'in_store';
  paymentType: 'cash' | 'credit';
  lines: InvoiceLine[];
  subtotal: number;
  discount: number;
  discountMode: 'amount' | 'percent';
  shipping: number;
  total: number;
  currency: 'IQD' | 'USD';
};

export type InvoiceOrganization = {
  business_name?: string;
  logo_url?: string;
  business_phone?: string;
  business_address?: string;
};

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character] || character));

const formatMoney = (value: number, currency: InvoiceData['currency']) =>
  `${Number(value || 0).toLocaleString('ar-IQ')} ${currency === 'IQD' ? 'د.ع' : '$'}`;

const waitForLogo = (iframe: HTMLIFrameElement, timeout = 1500) => new Promise<void>(resolve => {
  const image = iframe.contentDocument?.querySelector<HTMLImageElement>('#invoice-logo');
  if (!image || image.complete) return resolve();
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    resolve();
  };
  image.onload = finish;
  image.onerror = finish;
  window.setTimeout(finish, timeout);
});

export async function printInvoicePDF(invoice: InvoiceData, organization: InvoiceOrganization): Promise<void> {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'طباعة الفاتورة');
  Object.assign(iframe.style, {
    position: 'fixed', width: '0', height: '0', border: '0', opacity: '0',
    pointerEvents: 'none', left: '-9999px', top: '-9999px',
  });
  document.body.appendChild(iframe);

  const date = new Date(invoice.createdAt);
  const paymentLabel = invoice.paymentType === 'credit' ? 'آجل' : 'نقدي';
  const customerTypeLabel = invoice.customerType === 'online' ? 'أونلاين' : 'زيارة للمحل';
  const discountLabel = invoice.discountMode === 'percent'
    ? `الخصم (${Number(invoice.discount || 0)}%)`
    : 'الخصم';
  const logo = organization.logo_url
    ? `<img id="invoice-logo" src="${escapeHtml(organization.logo_url)}" alt="شعار الشركة">`
    : '<div class="logo-placeholder">C</div>';
  const rows = invoice.lines.map((line, index) => `<tr>
    <td>${index + 1}</td><td>${escapeHtml(line.name)}</td><td>${line.qty}</td>
    <td>${formatMoney(line.price, invoice.currency)}</td><td>${formatMoney(line.price * line.qty, invoice.currency)}</td>
  </tr>`).join('');

  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>فاتورة ${escapeHtml(invoice.invoiceNumber)}</title><style>
    @page { size: A4; margin: 0; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; color: #0F172A; font-family: Cairo, "Segoe UI", Tahoma, Arial, sans-serif; }
    body { direction: rtl; }
    .invoice { min-height: 297mm; padding: 16mm; position: relative; background: #fff; }
    .topbar { height: 6px; background: #F97316; border-radius: 0 0 4px 4px; margin: -16mm -16mm 14mm; }
    .header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
    .company { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .company img, .logo-placeholder { width: 68px; height: 68px; object-fit: contain; border-radius: 12px; border: 1px solid #E2E8F0; padding: 4px; background: #fff; }
    .logo-placeholder { display: grid; place-items: center; color: #F97316; font-size: 30px; font-weight: 800; }
    h1 { margin: 0 0 5px; font-size: 22px; font-weight: 800; color: #0F172A; }
    .company p, .meta p { margin: 3px 0; color: #64748B; font-size: 11px; }
    .meta { text-align: left; min-width: 190px; }
    .title { display: inline-block; margin-bottom: 8px !important; padding: 7px 18px; border-radius: 8px; background: #F97316; color: white !important; font-size: 16px !important; font-weight: 800; }
    .meta strong { color: #0F172A; }
    .payment { display: inline-block; padding: 3px 10px; border-radius: 999px; color: #fff !important; background: ${invoice.paymentType === 'credit' ? '#F97316' : '#10B981'}; font-weight: 700; }
    .section-title { margin: 18px 0 8px; font-size: 12px; font-weight: 800; color: #0F172A; }
    .customer { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; padding: 13px 15px; border: 1px solid #E2E8F0; border-radius: 10px; background: #F8FAFC; }
    .customer div { display: flex; justify-content: space-between; gap: 10px; font-size: 11px; }
    .customer span { color: #64748B; } .customer strong { color: #0F172A; }
    .tag { color: #F97316 !important; }
    table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 11px; }
    th { padding: 10px 12px; background: #0F172A; color: #fff; text-align: right; font-weight: 700; }
    td { padding: 10px 12px; border-bottom: 1px solid #E2E8F0; text-align: right; }
    tbody tr:nth-child(even) { background: #F8FAFC; }
    th:first-child, td:first-child { width: 8%; text-align: center; } th:nth-child(3), td:nth-child(3) { width: 12%; text-align: center; }
    .summary { width: 52%; min-width: 270px; margin: 18px 0 0 auto; font-size: 11px; }
    .summary-row { display: flex; justify-content: space-between; padding: 6px 10px; border-bottom: 1px solid #E2E8F0; }
    .grand { margin-top: 7px; padding: 12px 10px; border: 1px solid #FDBA74; border-radius: 9px; background: #FFF7ED; color: #C2410C; font-size: 15px; font-weight: 800; }
    .footer { position: absolute; right: 16mm; left: 16mm; bottom: 16mm; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; direction: ltr; }
    .signature { height: 90px; padding: 12px; border: 1.5px dashed #CBD5E1; border-radius: 10px; text-align: right; direction: rtl; color: #64748B; font-size: 11px; }
    .signature strong { color: #0F172A; } .thanks { margin: 14px 0 0; color: #94A3B8; text-align: center; font-size: 10px; }
  </style></head><body><main class="invoice"><div class="topbar"></div>
    <header class="header"><div class="company">${logo}<div><h1>${escapeHtml(organization.business_name || 'Cashly')}</h1>${organization.business_phone ? `<p>${escapeHtml(organization.business_phone)}</p>` : ''}${organization.business_address ? `<p>${escapeHtml(organization.business_address)}</p>` : ''}</div></div>
      <div class="meta"><p class="title">فاتورة بيع</p><p>رقم الفاتورة: <strong>${escapeHtml(invoice.invoiceNumber)}</strong></p><p>التاريخ والوقت: ${escapeHtml(date.toLocaleString('ar-IQ'))}</p><p>حالة الدفع: <strong class="payment">${paymentLabel}</strong></p></div></header>
    <h2 class="section-title">بيانات الزبون</h2><section class="customer"><div><span>اسم الزبون</span><strong>${escapeHtml(invoice.customerName || 'عميل نقدي')}</strong></div><div><span>رقم الهاتف</span><strong>${escapeHtml(invoice.customerPhone || '—')}</strong></div><div><span>المحافظة / المنطقة</span><strong>${escapeHtml(invoice.customerAddress || '—')}</strong></div><div><span>نوع الزبون</span><strong class="tag">${customerTypeLabel}</strong></div></section>
    <table><thead><tr><th>ت</th><th>المنتج</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table>
    <section class="summary"><div class="summary-row"><span>المجموع الفرعي</span><strong>${formatMoney(invoice.subtotal, invoice.currency)}</strong></div><div class="summary-row"><span>${discountLabel}</span><strong>${formatMoney(invoice.discountMode === 'percent' ? invoice.subtotal * Number(invoice.discount || 0) / 100 : invoice.discount, invoice.currency)}</strong></div><div class="summary-row"><span>أجور التوصيل</span><strong>${formatMoney(invoice.shipping, invoice.currency)}</strong></div><div class="summary-row grand"><span>الإجمالي النهائي الصافي</span><strong>${formatMoney(invoice.total, invoice.currency)}</strong></div></section>
    <footer class="footer"><div class="signatures"><div class="signature"><strong>توقيع المستلم / الزبون</strong></div><div class="signature"><strong>ختم وتوقيع الشركة</strong></div></div><p class="thanks">شكراً لتعاملكم معنا، نتمنى لكم تجربة تسوق سعيدة.</p></footer>
  </main></body></html>`;

  const frameDocument = iframe.contentDocument;
  if (!frameDocument) { iframe.remove(); return; }
  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();
  try {
    await waitForLogo(iframe);
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    await new Promise<void>(resolve => {
      const cleanup = () => { window.clearTimeout(timer); iframe.remove(); resolve(); };
      const timer = window.setTimeout(cleanup, 1000);
      iframe.contentWindow?.addEventListener('afterprint', cleanup, { once: true });
    });
  } catch {
    iframe.remove();
  }
}
