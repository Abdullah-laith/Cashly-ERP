-- إنشاء جدول الحسابات العامة (Ledger) للربط المحاسبي
CREATE TABLE IF NOT EXISTS ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type VARCHAR(50), -- e.g., 'SALE', 'DEBT_SETTLEMENT', 'EXPENSE', 'PURCHASE'
  reference_id UUID, -- id of the source record
  amount DECIMAL(15,2),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);