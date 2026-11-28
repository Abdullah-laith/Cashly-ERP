import type { InvoiceData, InvoiceOrganization } from '@/lib/print-engine';

const normalizeIraqiPhone = (phone?: string) => {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00964')) return digits.slice(2);
  if (digits.startsWith('964')) return digits;
  if (digits.startsWith('07')) return `964${digits.slice(1)}`;
  if (digits.startsWith('7')) return `964${digits}`;
  return digits;
};

const money = (value: number) => `${Number(value || 0).toLocaleString('ar-IQ')} د.ع`;

export function formatInvoiceWhatsApp(invoice: InvoiceData, organization?: InvoiceOrganization) {
  const date = new Date(invoice.createdAt).toLocaleString('ar-IQ', { dateStyle: 'medium', timeStyle: 'short' });
  const lines = invoice.lines.map((line, index) => `${index + 1}. ${line.name} × ${line.qty} — ${money(line.total ?? line.price * line.qty)}`).join('\n');
  const discount = invoice.discountMode === 'percent' ? `${invoice.discount}% (${money(invoice.subtotal * invoice.discount / 100)})` : money(invoice.discount);
  return [
    `*${organization?.business_name || 'فاتورة مبيعات'}*`,
    `رقم الفاتورة: ${invoice.invoiceNumber}`,
    `التاريخ والوقت: ${date}`,
    '',
    '*الأصناف:*',
    lines || 'لا توجد أصناف',
    '',
    `المجموع الفرعي: ${money(invoice.subtotal)}`,
    `الخصم: ${discount}`,
    invoice.shipping ? `التوصيل: ${money(invoice.shipping)}` : '',
    `*الإجمالي الصافي: ${money(invoice.total)}*`,
    '',
    'شكراً لتعاملكم معنا.',
  ].filter(Boolean).join('\n');
}

export function shareInvoiceViaWhatsApp(invoice: InvoiceData, organization?: InvoiceOrganization) {
  const message = encodeURIComponent(formatInvoiceWhatsApp(invoice, organization));
  const phone = normalizeIraqiPhone(invoice.customerPhone);
  const url = phone ? `https://wa.me/${phone}?text=${message}` : `https://wa.me/?text=${message}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
