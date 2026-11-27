'use client';

export type InvoiceLine = {
  name: string;
  qty: number;
  price: number;
  total?: number;
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

export type ReportColumn = { label: string; key: string; align?: 'right' | 'center' | 'left' };
export type ReportRow = Record<string, unknown>;
export type ReportData = {
  title: string;
  period?: string;
  organization: InvoiceOrganization;
  columns: ReportColumn[];
  rows: ReportRow[];
  summary?: Array<{ label: string; value: string | number }>;
  totalLabel?: string;
  totalValue?: string | number;
};

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character] || character));

const numberFormatter = new Intl.NumberFormat('en-US');
export const formatPrintNumber = (value: unknown) => numberFormatter.format(Number(value || 0));
export const formatPrintMoney = (value: unknown, currency: 'IQD' | 'USD' = 'IQD') => `${formatPrintNumber(value)} ${currency === 'IQD' ? 'د.ع' : '$'}`;
const ltr = (value: unknown) => `<span dir="ltr" style="unicode-bidi:isolate">${escapeHtml(value)}</span>`;

const printStyles = `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body { margin: 0; padding: 0; background: #fff; color: #0F172A; font-family: Cairo, 'Segoe UI', Tahoma, Arial, sans-serif; }
  body { direction: rtl; text-align: right; }
  .page { min-height: 297mm; padding: 15mm 14mm; position: relative; }
  table { width: 100%; border-collapse: collapse; }
  .topbar { height: 6px; margin: -15mm -14mm 14mm; background: #F97316; }
  .header-table td { vertical-align: top; padding: 0; }
  .company-cell { width: 58%; }
  .meta-cell { width: 42%; text-align: left; }
  .logo { width: 64px; height: 64px; object-fit: contain; border-radius: 10px; border: 1px solid #E2E8F0; padding: 3px; background: #fff; vertical-align: middle; }
  .logo-placeholder { display: inline-block; width: 64px; height: 64px; border-radius: 10px; background: #FFF7ED; color: #F97316; text-align: center; line-height: 64px; font-size: 28px; font-weight: 800; vertical-align: middle; }
  .company-copy { display: inline-block; margin-right: 10px; vertical-align: middle; }
  h1 { margin: 0 0 4px; font-size: 21px; }
  .muted { margin: 3px 0; color: #64748B; font-size: 11px; }
  .title-badge { display: inline-block; padding: 7px 15px; border-radius: 8px; background: #F97316; color: #fff; font-size: 15px; font-weight: 800; }
  .meta-line { margin: 5px 0; color: #475569; font-size: 11px; }
  .meta-line strong { color: #0F172A; }
  .payment { display: inline-block; padding: 3px 10px; border-radius: 999px; color: #fff; font-weight: 700; background: #10B981; }
  .payment.credit { background: #F59E0B; }
  .section-title { margin: 18px 0 8px; font-size: 12px; font-weight: 800; }
  .customer-box { padding: 12px 14px; border: 1px solid #E2E8F0; border-radius: 10px; background: #F8FAFC; }
  .customer-table td { width: 50%; padding: 4px 0; font-size: 11px; }
  .customer-label { color: #64748B; margin-left: 8px; }
  .customer-value { color: #0F172A; font-weight: 700; }
  .items-table { table-layout: fixed; margin-top: 18px; font-size: 11px; }
  .items-table th { padding: 10px 8px; background: #0F172A; color: #fff; font-weight: 700; }
  .items-table td { padding: 10px 8px; border: 1px solid #E2E8F0; vertical-align: top; }
  .items-table th:nth-child(1), .items-table td:nth-child(1) { width: 7%; text-align: center; }
  .items-table th:nth-child(2), .items-table td:nth-child(2) { width: 43%; text-align: right; word-wrap: break-word; }
  .items-table th:nth-child(3), .items-table td:nth-child(3) { width: 12%; text-align: center; }
  .items-table th:nth-child(4), .items-table td:nth-child(4), .items-table th:nth-child(5), .items-table td:nth-child(5) { width: 19%; text-align: center; }
  .items-table tbody tr:nth-child(even) { background: #F8FAFC; }
  .summary-table { width: 45%; margin-top: 16px; margin-left: 0; font-size: 11px; }
  .summary-table td { padding: 7px 10px; border-bottom: 1px solid #E2E8F0; }
  .summary-table td:last-child { text-align: left; }
  .grand-total td { padding: 11px 10px; border: 1px solid #F97316; background: #FFF7ED; color: #C2410C; font-size: 14px; font-weight: 800; }
  .signature-table { margin-top: 22mm; table-layout: fixed; }
  .signature-table td { width: 50%; height: 85px; padding: 12px; border: 1.5px dashed #CBD5E1; border-radius: 10px; color: #64748B; font-size: 11px; vertical-align: top; }
  .signature-table td + td { border-right: 0; }
  .signature-table strong { color: #0F172A; }
  .thanks { margin: 14px 0 0; color: #94A3B8; text-align: center; font-size: 10px; }
  .report-summary td { width: 25%; padding: 10px; border: 1px solid #E2E8F0; background: #F8FAFC; }
  .report-summary strong { display: block; margin-top: 4px; color: #0F172A; font-size: 14px; }
  .report-table { table-layout: fixed; margin-top: 18px; font-size: 11px; }
  .report-table th { padding: 9px 8px; background: #0F172A; color: #fff; }
  .report-table td { padding: 9px 8px; border: 1px solid #E2E8F0; word-wrap: break-word; }
  .report-table tbody tr:nth-child(even) { background: #F8FAFC; }
  .report-total { margin-top: 14px; padding: 11px 12px; border: 1px solid #F97316; background: #FFF7ED; color: #C2410C; font-weight: 800; }
  .footer { position: absolute; right: 14mm; bottom: 8mm; left: 14mm; color: #94A3B8; text-align: center; font-size: 9px; }
`;

const waitForAssets = (iframe: HTMLIFrameElement, timeout = 1800) => new Promise<void>(resolve => {
  const document = iframe.contentDocument;
  if (!document) return resolve();
  const images = Array.from(document.images);
  const fonts = document.fonts?.ready || Promise.resolve();
  let settled = false;
  const finish = () => { if (!settled) { settled = true; resolve(); } };
  Promise.all([fonts, ...images.map(image => image.complete ? Promise.resolve() : new Promise<void>(done => { image.onload = () => done(); image.onerror = () => done(); }))]).then(finish);
  window.setTimeout(finish, timeout);
});

const printHtml = async (html: string, title: string) => {
  const iframe = document.createElement('iframe');
  iframe.title = title;
  Object.assign(iframe.style, { position: 'fixed', width: '0', height: '0', border: '0', opacity: '0', pointerEvents: 'none', left: '-9999px', top: '-9999px' });
  document.body.appendChild(iframe);
  const frameDocument = iframe.contentDocument;
  if (!frameDocument) { iframe.remove(); return; }
  frameDocument.open(); frameDocument.write(html); frameDocument.close();
  try {
    await waitForAssets(iframe);
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    await new Promise<void>(resolve => {
      const timer = window.setTimeout(() => { iframe.remove(); resolve(); }, 1200);
      iframe.contentWindow?.addEventListener('afterprint', () => { window.clearTimeout(timer); iframe.remove(); resolve(); }, { once: true });
    });
  } catch { iframe.remove(); }
};

const organizationHeader = (organization: InvoiceOrganization, title: string, meta: string) => {
  const logo = organization.logo_url ? `<img class="logo" src="${escapeHtml(organization.logo_url)}" alt="شعار الشركة">` : '<span class="logo-placeholder">C</span>';
  return `<div class="topbar"></div><table class="header-table"><tr><td class="company-cell">${logo}<div class="company-copy"><h1>${escapeHtml(organization.business_name || 'Cashly')}</h1>${organization.business_phone ? `<p class="muted">${ltr(organization.business_phone)}</p>` : ''}${organization.business_address ? `<p class="muted">${escapeHtml(organization.business_address)}</p>` : ''}</div></td><td class="meta-cell"><span class="title-badge">${escapeHtml(title)}</span><p class="meta-line">${escapeHtml(meta)}</p><p class="meta-line">تاريخ الطباعة: ${ltr(new Date().toLocaleDateString('en-US'))}</p></td></tr></table>`;
};

export async function printInvoicePDF(invoice: InvoiceData, organization: InvoiceOrganization): Promise<void> {
  const date = new Date(invoice.createdAt);
  const discountLabel = invoice.discountMode === 'percent' ? `الخصم (${formatPrintNumber(invoice.discount)}%)` : 'الخصم';
  const lines = invoice.lines.length ? invoice.lines : [{ name: 'مبيعات عامة', qty: 1, price: invoice.total, total: invoice.total }];
  const rows = lines.map((line, index) => `<tr><td>${ltr(index + 1)}</td><td>${escapeHtml(line.name)}</td><td>${ltr(formatPrintNumber(line.qty))}</td><td>${ltr(formatPrintMoney(line.price, invoice.currency))}</td><td>${ltr(formatPrintMoney(line.total ?? line.price * line.qty, invoice.currency))}</td></tr>`).join('');
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(invoice.invoiceNumber)}</title><style>${printStyles}</style></head><body><main class="page">${organizationHeader(organization, 'فاتورة بيع', `رقم الفاتورة: ${ltr(invoice.invoiceNumber)} · ${ltr(date.toLocaleString('en-US'))}`)}<h2 class="section-title">بيانات الزبون</h2><section class="customer-box"><table class="customer-table"><tr><td><span class="customer-label">اسم الزبون</span><strong class="customer-value">${escapeHtml(invoice.customerName || 'عميل نقدي')}</strong></td><td><span class="customer-label">رقم الهاتف</span><strong class="customer-value">${ltr(invoice.customerPhone || '—')}</strong></td></tr><tr><td><span class="customer-label">نوع الزبون</span><strong class="customer-value">${invoice.customerType === 'online' ? 'أونلاين' : 'زيارة للمحل'}</strong></td><td><span class="customer-label">المحافظة / المنطقة</span><strong class="customer-value">${escapeHtml(invoice.customerAddress || '—')}</strong></td></tr></table></section><table class="items-table"><thead><tr><th>ت</th><th>المنتج</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table><table class="summary-table"><tr><td>المجموع الفرعي</td><td>${ltr(formatPrintMoney(invoice.subtotal, invoice.currency))}</td></tr><tr><td>${escapeHtml(discountLabel)}</td><td>${ltr(formatPrintMoney(invoice.discountMode === 'percent' ? invoice.subtotal * invoice.discount / 100 : invoice.discount, invoice.currency))}</td></tr><tr><td>أجور التوصيل</td><td>${ltr(formatPrintMoney(invoice.shipping, invoice.currency))}</td></tr><tr class="grand-total"><td>الإجمالي النهائي الصافي</td><td>${ltr(formatPrintMoney(invoice.total, invoice.currency))}</td></tr></table><p class="meta-line" style="margin-top:10px">حالة الدفع: <strong class="payment ${invoice.paymentType === 'credit' ? 'credit' : ''}">${invoice.paymentType === 'credit' ? 'آجل' : 'نقدي'}</strong></p><table class="signature-table"><tr><td><strong>ختم وتوقيع الشركة</strong></td><td><strong>توقيع المستلم / الزبون</strong></td></tr></table><p class="thanks">شكراً لتعاملكم معنا، نتمنى لكم تجربة تسوق سعيدة.</p><div class="footer">${escapeHtml(organization.business_name || 'Cashly')}</div></main></body></html>`;
  await printHtml(html, 'طباعة الفاتورة');
}

export async function printReportPDF(report: ReportData): Promise<void> {
  const columns = report.columns;
  const summary = report.summary?.length ? `<table class="report-summary"><tr>${report.summary.map(item => `<td><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></td>`).join('')}</tr></table>` : '';
  const rows = report.rows.length ? report.rows.map(row => `<tr>${columns.map(column => `<td style="text-align:${column.align || 'right'}">${escapeHtml(row[column.key])}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${columns.length}" style="text-align:center">لا توجد بيانات</td></tr>`;
  const total = report.totalLabel && report.totalValue !== undefined ? `<div class="report-total">${escapeHtml(report.totalLabel)}: ${escapeHtml(report.totalValue)}</div>` : '';
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(report.title)}</title><style>${printStyles}</style></head><body><main class="page">${organizationHeader(report.organization, report.title, report.period || '')}${summary}<table class="report-table"><thead><tr>${columns.map(column => `<th style="text-align:${column.align || 'right'}">${escapeHtml(column.label)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>${total}<div class="footer">${escapeHtml(report.organization.business_name || 'Cashly')} · ${ltr(new Date().toLocaleDateString('en-US'))}</div></main></body></html>`;
  await printHtml(html, 'طباعة التقرير');
}
