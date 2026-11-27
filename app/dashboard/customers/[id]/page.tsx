'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, CircleDollarSign, FileText } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  governorate: string | null;
  customer_type: 'online' | 'in_store' | null;
  balance: number | null;
};

type Invoice = {
  id: string;
  invoice_number: string | null;
  total_amount: number | string;
  remaining_debt: number | string | null;
  payment_type: string | null;
  created_at: string;
};

const money = (value: number) => `${value.toLocaleString('ar-IQ')} د.ع`;

export default function CustomerDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCustomer = async () => {
      setLoading(true);
      const [{ data: customerData, error: customerError }, { data: invoiceData, error: invoiceError }] = await Promise.all([
        supabase.from('customers').select('*').eq('id', params.id).single(),
        supabase.from('invoices').select('id, invoice_number, total_amount, remaining_debt, payment_type, created_at').eq('customer_id', params.id).is('deleted_at', null).order('created_at', { ascending: false }),
      ]);
      if (customerError || invoiceError) setError(customerError?.message || invoiceError?.message || 'تعذر تحميل بيانات العميل');
      setCustomer(customerData);
      setInvoices(invoiceData || []);
      setLoading(false);
    };
    void loadCustomer();
  }, [params.id]);

  const totalPurchases = invoices.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0);

  return (
    <div dir="rtl" className="customer-details-page">
      <Button variant="outline" onClick={() => router.push('/dashboard/customers')}><ArrowRight className="ml-2 h-4 w-4" /> العودة إلى العملاء</Button>
      {error && <p className="customers-error">{error}</p>}
      {loading ? <p className="customer-details-loading">جارٍ تحميل بيانات العميل...</p> : customer && <>
        <div className="customer-details-hero"><div><p className="customers-kicker">ملف العميل</p><h1>{customer.name}</h1><p>{customer.phone || 'لا يوجد رقم هاتف'}{customer.governorate ? ` · ${customer.governorate}` : ''}</p></div><span className={`customer-channel-badge ${customer.customer_type === 'online' ? 'is-online' : 'is-store'}`}>{customer.customer_type === 'online' ? 'أونلاين' : 'زيارة للمحل'}</span></div>
        <div className="customer-details-summary"><div><FileText /><span>عدد الفواتير<strong>{invoices.length.toLocaleString('ar-IQ')}</strong></span></div><div><CircleDollarSign /><span>إجمالي المشتريات<strong>{money(totalPurchases)}</strong></span></div><div><CalendarDays /><span>الرصيد الحالي<strong>{money(Number(customer.balance || 0))}</strong></span></div></div>
        <section className="customer-invoices-card"><div className="customer-invoices-heading"><div><p>سجل التعاملات</p><h2>مشتريات العميل</h2></div><span>{invoices.length.toLocaleString('ar-IQ')} فاتورة</span></div>{invoices.length ? <div className="customer-invoices-table-wrap"><table><thead><tr><th>رقم الفاتورة</th><th>التاريخ</th><th>طريقة الدفع</th><th>الإجمالي</th><th>المتبقي</th></tr></thead><tbody>{invoices.map(invoice => <tr key={invoice.id}><td>{invoice.invoice_number || invoice.id.slice(0, 8)}</td><td>{new Date(invoice.created_at).toLocaleDateString('ar-IQ')}</td><td><span className="invoice-payment-badge">{invoice.payment_type === 'credit' || invoice.payment_type === 'آجل' ? 'آجل' : 'نقدي'}</span></td><td>{money(Number(invoice.total_amount || 0))}</td><td className={Number(invoice.remaining_debt || 0) > 0 ? 'invoice-debt' : 'invoice-paid'}>{money(Number(invoice.remaining_debt || 0))}</td></tr>)}</tbody></table></div> : <div className="customer-invoices-empty">لا توجد مشتريات مسجلة لهذا العميل حتى الآن.</div>}</section>
      </>}
    </div>
  );
}
