import api from './api';

export interface Invoice {
  id: string;
  appointment_id: string;
  invoice_number: string;
  customer_id: string;
  provider_id: string;
  amount: number;
  gst_rate: number;
  gst_amount: number;
  total_amount: number;
  status: string;
  generated_at: string;
  customer_name?: string | null;
  provider_name?: string | null;
  appointment_date?: string | null;
  appointment_start_time?: string | null;
  appointment_end_time?: string | null;
}

interface InvoiceList {
  invoices: Invoice[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

/** Invoice service */
export const invoiceService = {
  async getMyInvoices(params?: { page?: number; size?: number }): Promise<InvoiceList> {
    const response = await api.get<InvoiceList>('/invoices/me', { params });
    return response.data;
  },

  async getInvoice(id: string): Promise<Invoice> {
    const response = await api.get<Invoice>(`/invoices/${id}`);
    return response.data;
  },
};
