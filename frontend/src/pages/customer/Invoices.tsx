import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  ReceiptText,
  Wallet as WalletIcon,
  CheckCircle2,
  Download,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { PageTransition } from '@/components/layout/PageTransition';
import { invoiceService } from '@/services/invoiceService';
import type { Invoice } from '@/services/invoiceService';
import { formatCurrency, formatDate } from '@/utils';
import { cn } from '@/utils/cn';

const PAGE_SIZE = 10;

// ─── Animation Variants ─────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Normalizes the various "paid" status strings to a single boolean. */
function isPaid(status: string): boolean {
  return status?.toLowerCase() === 'paid';
}

// ─── Status Chip ──────────────────────────────────────────────────────────────

interface StatusChipProps {
  status: string;
}

/** Monochrome bordered chip. Relies on a label + icon, not color alone. */
const StatusChip: React.FC<StatusChipProps> = ({ status }) => {
  const paid = isPaid(status);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs font-semibold',
        paid
          ? 'border-gray-900 text-gray-900 dark:border-gray-100 dark:text-gray-100'
          : 'border-gray-300 text-gray-500 dark:border-gray-700 dark:text-gray-400'
      )}
    >
      {paid ? (
        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
      ) : (
        <ReceiptText className="w-3.5 h-3.5" aria-hidden="true" />
      )}
      {paid ? 'Paid' : 'Pending'}
    </span>
  );
};

// ─── Summary Card ─────────────────────────────────────────────────────────────

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ icon, label, value }) => (
  <Card className="border-gray-200 dark:border-gray-800">
    <div className="flex items-center gap-3">
      <span
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center border border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300"
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {label}
        </p>
        <p className="mt-0.5 truncate text-xl font-bold text-gray-900 dark:text-gray-100">
          {value}
        </p>
      </div>
    </div>
  </Card>
);

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Customer billing / invoices page.
 * Lists invoices with summary stats, a responsive table, and pagination.
 */
export const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const loadInvoices = useCallback(async (targetPage: number) => {
    setIsLoading(true);
    try {
      const data = await invoiceService.getMyInvoices({ page: targetPage, size: PAGE_SIZE });
      setInvoices(data.invoices);
      setTotal(data.total);
      setTotalPages(data.total_pages || 1);
      setPage(data.page || targetPage);
    } catch {
      // Errors are surfaced by the API interceptor.
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    loadInvoices(nextPage);
  };

  const totalBilled = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const totalPaid = invoices
    .filter((inv) => isPaid(inv.status))
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

  /** Generate and download a beautiful HTML invoice as a printable page */
  const downloadInvoice = (invoice: Invoice) => {
    const providerName = invoice.provider_name || 'Provider';
    const customerName = invoice.customer_name || 'Customer';
    const appointmentDate = invoice.appointment_date ? formatDate(invoice.appointment_date) : formatDate(invoice.generated_at);
    const appointmentTime =
      invoice.appointment_start_time && invoice.appointment_end_time
        ? `${invoice.appointment_start_time.slice(0, 5)} - ${invoice.appointment_end_time.slice(0, 5)}`
        : '—';

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #111; }
    .logo { font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .logo-sub { font-size: 11px; color: #6b7280; margin-top: 4px; }
    .invoice-title { text-align: right; }
    .invoice-title h1 { font-size: 28px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; }
    .invoice-title p { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px; }
    .meta-section h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 8px; }
    .meta-section p { font-size: 13px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { text-align: left; padding: 12px 16px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
    th:last-child { text-align: right; }
    td { padding: 14px 16px; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
    td:last-child { text-align: right; font-weight: 600; }
    .totals { margin-left: auto; width: 280px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; }
    .totals-row.total { border-top: 2px solid #111; padding-top: 12px; margin-top: 8px; font-size: 16px; font-weight: 700; }
    .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af; }
    .status { display: inline-block; padding: 4px 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid; }
    .status-paid { color: #059669; border-color: #059669; }
    .status-pending { color: #d97706; border-color: #d97706; }
    .summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .summary-item { padding: 14px; border: 1px solid #e5e7eb; }
    .summary-item label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 6px; }
    .summary-item span { font-size: 13px; font-weight: 600; color: #111827; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">AppointEase</div>
      <div class="logo-sub">Appointment Scheduling Platform</div>
    </div>
    <div class="invoice-title">
      <h1>Invoice</h1>
      <p>${invoice.invoice_number}</p>
    </div>
  </div>

  <div class="meta">
    <div class="meta-section">
      <h3>Invoice Details</h3>
      <p><strong>Invoice No:</strong> ${invoice.invoice_number}</p>
      <p><strong>Date:</strong> ${formatDate(invoice.generated_at)}</p>
      <p><strong>Status:</strong> <span class="status ${isPaid(invoice.status) ? 'status-paid' : 'status-pending'}">${isPaid(invoice.status) ? 'PAID' : 'PENDING'}</span></p>
    </div>
    <div class="meta-section">
      <h3>Appointment Details</h3>
      <p><strong>Provider:</strong> ${providerName}</p>
      <p><strong>Customer:</strong> ${customerName}</p>
      <p><strong>Appointment Date:</strong> ${appointmentDate}</p>
      <p><strong>Appointment Time:</strong> ${appointmentTime}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Appointment Service Fee</td>
        <td>${formatCurrency(invoice.amount)}</td>
      </tr>
      <tr>
        <td>GST (${invoice.gst_rate}%)</td>
        <td>${formatCurrency(invoice.gst_amount)}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row">
      <span>Subtotal</span>
      <span>${formatCurrency(invoice.amount)}</span>
    </div>
    <div class="totals-row">
      <span>GST (${invoice.gst_rate}%)</span>
      <span>${formatCurrency(invoice.gst_amount)}</span>
    </div>
    <div class="totals-row total">
      <span>Total</span>
      <span>${formatCurrency(invoice.total_amount)}</span>
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-item">
      <label>Provider</label>
      <span>${providerName}</span>
    </div>
    <div class="summary-item">
      <label>Customer</label>
      <span>${customerName}</span>
    </div>
  </div>

  <div class="footer">
    <p>Thank you for using AppointEase. This is a computer-generated invoice.</p>
    <p style="margin-top: 4px;">For queries, contact support@appointease.com</p>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Invoices</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              View and download your billing history
            </p>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {total} {total === 1 ? 'invoice' : 'invoices'}
          </span>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            icon={<FileText className="w-5 h-5" />}
            label="Total invoices"
            value={total.toLocaleString('en-IN')}
          />
          <SummaryCard
            icon={<WalletIcon className="w-5 h-5" />}
            label="Total billed"
            value={formatCurrency(totalBilled)}
          />
          <SummaryCard
            icon={<CheckCircle2 className="w-5 h-5" />}
            label="Total paid"
            value={formatCurrency(totalPaid)}
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <LoadingSpinner size="lg" text="Loading invoices..." />
        ) : invoices.length === 0 ? (
          <Card className="border-gray-200 dark:border-gray-800">
            <EmptyState
              icon={<FileText className="w-8 h-8 text-gray-400 dark:text-gray-500" />}
              title="No invoices yet"
              description="Invoices for your completed bookings will appear here."
            />
          </Card>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            {/* Desktop table */}
            <Card className="hidden border-gray-200 dark:border-gray-800 md:block" padding={false}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800">
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Provider
                      </th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Date
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Amount
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        GST
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Total
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Status
                      </th>
                      <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Download
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {invoices.map((invoice) => (
                        <motion.tr
                          key={invoice.id}
                          variants={itemVariants}
                          className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
                        >
                        <td className="px-5 py-4 font-medium text-gray-900 dark:text-gray-100">
                          <div className="space-y-1">
                            <p>{invoice.provider_name || 'Provider'}</p>
                            <p className="text-xs font-normal text-gray-400 dark:text-gray-500">
                              {invoice.invoice_number}
                            </p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-gray-500 dark:text-gray-400">
                          {formatDate(invoice.generated_at)}
                        </td>
                        <td className="px-5 py-4 text-right text-gray-700 dark:text-gray-300">
                          {formatCurrency(invoice.amount)}
                        </td>
                        <td className="px-5 py-4 text-right text-gray-700 dark:text-gray-300">
                          {formatCurrency(invoice.gst_amount)}
                          <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">
                            ({invoice.gst_rate}%)
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrency(invoice.total_amount)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <StatusChip status={invoice.status} />
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button
                            onClick={() => downloadInvoice(invoice)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            aria-label="Download invoice"
                            title="Download Invoice"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Mobile cards */}
            <div className="space-y-4 md:hidden">
              {invoices.map((invoice) => (
                <motion.div key={invoice.id} variants={itemVariants}>
                  <Card className="border-gray-200 dark:border-gray-800">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-gray-900 dark:text-gray-100">
                            {invoice.provider_name || 'Provider'}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            {invoice.invoice_number} • {formatDate(invoice.generated_at)}
                          </p>
                        </div>
                      <StatusChip status={invoice.status} />
                    </div>

                    <dl className="mt-4 space-y-2 border-t border-gray-200 pt-4 text-sm dark:border-gray-800">
                      <div className="flex items-center justify-between">
                        <dt className="text-gray-500 dark:text-gray-400">Amount</dt>
                        <dd className="text-gray-700 dark:text-gray-300">
                          {formatCurrency(invoice.amount)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-gray-500 dark:text-gray-400">
                          GST ({invoice.gst_rate}%)
                        </dt>
                        <dd className="text-gray-700 dark:text-gray-300">
                          {formatCurrency(invoice.gst_amount)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between border-t border-gray-200 pt-2 dark:border-gray-800">
                        <dt className="font-medium text-gray-900 dark:text-gray-100">Total</dt>
                        <dd className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrency(invoice.total_amount)}
                        </dd>
                      </div>
                    </dl>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Pagination */}
        {!isLoading && invoices.length > 0 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </PageTransition>
  );
};
