import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { FileSpreadsheet, Download, Search, Filter, Calendar, RefreshCw, ChevronLeft, ChevronRight, DollarSign, Star, CheckCircle, Clock, XCircle, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

const STATUS_BADGES = {
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  awaiting_payment: 'bg-orange-100 text-orange-800 border-orange-200',
  accepted: 'bg-sky-100 text-sky-800 border-sky-200',
  cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
};

export default function Reports() {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Filters & Search
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');

  // Sorting
  const [sortField, setSortField] = useState('booking_id');
  const [sortAsc, setSortAsc] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;

  useEffect(() => {
    fetchReportData();
  }, [statusFilter, fromDate, toDate]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      if (search) params.search = search;

      const res = await adminAPI.getBookingsExport(params);
      setData(res.data?.bookings || []);
      setSummary(res.data?.summary || null);
    } catch (err) {
      console.error('Failed to fetch report data', err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchReportData();
  };

  // Client-side search and sort
  const filteredData = data.filter(item => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      item.customer_name?.toLowerCase().includes(term) ||
      item.provider_name?.toLowerCase().includes(term) ||
      item.service_category?.toLowerCase().includes(term) ||
      item.location?.toLowerCase().includes(term) ||
      item.booking_id?.toString().includes(term)
    );
  });

  const sortedData = [...filteredData].sort((a, b) => {
    let valA = a[sortField] ?? '';
    let valB = b[sortField] ?? '';

    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedData.length / rowsPerPage) || 1;
  const paginatedData = sortedData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (sortedData.length === 0) return;

    const headers = [
      'Booking ID', 'Status', 'Service Category', 'Emergency',
      'Customer Name', 'Customer Phone', 'Customer Ward',
      'Provider Name', 'Provider Phone', 'Provider Ward',
      'Location / Address', 'Booking Date', 'Created Date',
      'Total Amount (Rs)', 'Platform Fee (Rs)', 'Payment Method', 'Payment Status',
      'Rating (1-5)', 'Review Comment'
    ];

    const rows = sortedData.map(b => [
      b.booking_id,
      b.status,
      `"${b.service_category || ''}"`,
      b.is_emergency ? 'YES' : 'NO',
      `"${b.customer_name || ''}"`,
      `"${b.customer_phone || ''}"`,
      `"${b.customer_ward || ''}"`,
      `"${b.provider_name || 'Unassigned'}"`,
      `"${b.provider_phone || ''}"`,
      `"${b.provider_ward || ''}"`,
      `"${b.location || ''}"`,
      b.booking_date ? format(new Date(b.booking_date), 'yyyy-MM-dd HH:mm') : '',
      b.booked_at ? format(new Date(b.booked_at), 'yyyy-MM-dd HH:mm') : '',
      b.amount_paid || b.total_price || 650,
      b.platform_commission || 0,
      b.payment_method || 'N/A',
      b.payment_status || 'Pending',
      b.review_rating || 'N/A',
      `"${b.review_comment?.replace(/"/g, '""') || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GhareluSewa_Report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Excel (.xlsx) using xlsx library
  const exportToExcel = () => {
    if (sortedData.length === 0) return;

    const excelData = sortedData.map(b => ({
      'Booking ID': b.booking_id,
      'Status': b.status?.toUpperCase(),
      'Service Category': b.service_category,
      'Emergency': b.is_emergency ? 'Yes' : 'No',
      'Customer Name': b.customer_name,
      'Customer Phone': b.customer_phone || 'N/A',
      'Customer Ward': b.customer_ward || 'N/A',
      'Provider Name': b.provider_name || 'Unassigned',
      'Provider Phone': b.provider_phone || 'N/A',
      'Provider Ward': b.provider_ward || 'N/A',
      'Address': b.location,
      'Scheduled Date': b.booking_date ? format(new Date(b.booking_date), 'yyyy-MM-dd HH:mm') : '',
      'Created Date': b.booked_at ? format(new Date(b.booked_at), 'yyyy-MM-dd HH:mm') : '',
      'Total Price (NPR)': Number(b.amount_paid || b.total_price || 650),
      'Platform Commission (NPR)': Number(b.platform_commission || 0),
      'Payment Status': b.payment_status || 'Pending',
      'Payment Method': b.payment_method || 'N/A',
      'Rating': b.review_rating || 'N/A',
      'Review Comment': b.review_comment || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Service Bookings');

    // Auto fit column widths
    const max_width = excelData.reduce((w, r) => {
      return Object.keys(r).map((key, i) => {
        const val = String(r[key] || '');
        return Math.max(w[i] || key.length, val.length);
      });
    }, []);
    worksheet['!cols'] = max_width.map(l => ({ wch: l + 3 }));

    XLSX.writeFile(workbook, `GhareluSewa_MasterReport_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  return (
    <div className="space-y-6">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-[#07535f]/10 text-[#07535f] rounded-2xl flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Master Reports & Export</h1>
            <p className="text-xs text-gray-500 mt-0.5">Spreadsheet-style platform audit logs for service bookings, payments, and ratings.</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={exportToCSV}
            disabled={sortedData.length === 0}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-gray-200 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-gray-600" /> Export CSV
          </button>
          <button
            onClick={exportToExcel}
            disabled={sortedData.length === 0}
            className="flex items-center gap-2 bg-[#07535f] hover:bg-[#06424b] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-300" /> Download Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* ── KPI Summary Header Tiles ── */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Records</p>
            <p className="text-2xl font-black text-gray-800 mt-1">{summary.total_records}</p>
            <p className="text-[10px] text-emerald-600 font-semibold mt-1">Filtered result count</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Gross Volume</p>
            <p className="text-2xl font-black text-[#07535f] mt-1">Rs. {summary.total_amount.toLocaleString()}</p>
            <p className="text-[10px] text-gray-400 font-semibold mt-1">Service Value</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Platform Revenue (10%)</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">Rs. {summary.total_commission.toLocaleString()}</p>
            <p className="text-[10px] text-emerald-600 font-semibold mt-1">Net Commission</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Completed Jobs</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{summary.completed}</p>
            <p className="text-[10px] text-gray-400 font-semibold mt-1">{summary.pending} Pending</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Average Rating</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-2xl font-black text-amber-500">{summary.avg_rating || 'N/A'}</span>
              <Star className="w-5 h-5 fill-amber-400 text-amber-400 mb-0.5" />
            </div>
            <p className="text-[10px] text-gray-400 font-semibold mt-1">Platform satisfaction score</p>
          </div>
        </div>
      )}

      {/* ── Filters & Controls Bar ── */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search customer, provider, service category, location or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-none text-xs focus:outline-none text-gray-800 font-medium"
          />
        </form>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-xs font-bold rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:border-[#07535f] cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="in_progress">In Progress</option>
            <option value="awaiting_payment">Awaiting Payment</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent text-[11px] font-medium text-gray-700 focus:outline-none"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent text-[11px] font-medium text-gray-700 focus:outline-none"
            />
          </div>

          {(statusFilter || fromDate || toDate || search) && (
            <button
              onClick={() => { setStatusFilter(''); setFromDate(''); setToDate(''); setSearch(''); }}
              className="text-xs text-rose-600 font-bold hover:underline px-2 py-1"
            >
              Reset
            </button>
          )}

          <button
            onClick={fetchReportData}
            title="Refresh Data"
            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Spreadsheet-style Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-gray-100/70 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider select-none">
                <th onClick={() => handleSort('booking_id')} className="px-4 py-3.5 cursor-pointer hover:bg-gray-200/60 transition-colors">
                  <div className="flex items-center gap-1">
                    # ID <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('status')} className="px-4 py-3.5 cursor-pointer hover:bg-gray-200/60 transition-colors">
                  <div className="flex items-center gap-1">
                    Status <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('service_category')} className="px-4 py-3.5 cursor-pointer hover:bg-gray-200/60 transition-colors">
                  <div className="flex items-center gap-1">
                    Service <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('customer_name')} className="px-4 py-3.5 cursor-pointer hover:bg-gray-200/60 transition-colors">
                  <div className="flex items-center gap-1">
                    Customer Details <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('provider_name')} className="px-4 py-3.5 cursor-pointer hover:bg-gray-200/60 transition-colors">
                  <div className="flex items-center gap-1">
                    Provider Details <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('booking_date')} className="px-4 py-3.5 cursor-pointer hover:bg-gray-200/60 transition-colors">
                  <div className="flex items-center gap-1">
                    Scheduled Date <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('location')} className="px-4 py-3.5 cursor-pointer hover:bg-gray-200/60 transition-colors">
                  <div className="flex items-center gap-1">
                    Location <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('total_price')} className="px-4 py-3.5 text-right cursor-pointer hover:bg-gray-200/60 transition-colors">
                  <div className="flex items-center justify-end gap-1">
                    Amount <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('payment_status')} className="px-4 py-3.5 cursor-pointer hover:bg-gray-200/60 transition-colors">
                  <div className="flex items-center gap-1">
                    Payment <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('review_rating')} className="px-4 py-3.5 text-center cursor-pointer hover:bg-gray-200/60 transition-colors">
                  <div className="flex items-center justify-center gap-1">
                    Rating <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan="10" className="px-4 py-3.5">
                      <div className="h-6 bg-gray-100 rounded-md animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-4 py-12 text-center text-gray-400 font-medium">
                    No matching service booking records found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, idx) => (
                  <tr
                    key={row.booking_id}
                    className={`hover:bg-teal-50/40 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}
                  >
                    {/* ID */}
                    <td className="px-4 py-3 font-mono font-bold text-[#07535f]">
                      #{row.booking_id}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${STATUS_BADGES[row.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {row.status?.replaceAll('_', ' ')}
                      </span>
                      {row.is_emergency && (
                        <span className="ml-1 text-[9px] bg-red-500 text-white font-extrabold px-1 rounded">SOS</span>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {row.service_category}
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-900">{row.customer_name}</div>
                      <div className="text-[10px] text-gray-400">{row.customer_phone || row.customer_email || 'No phone'} · {row.customer_ward || 'Ward N/A'}</div>
                    </td>

                    {/* Provider */}
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-900">{row.provider_name || <span className="text-gray-400 font-normal italic">Unassigned</span>}</div>
                      <div className="text-[10px] text-gray-400">{row.provider_phone || '—'} · {row.provider_ward || 'Ward N/A'}</div>
                    </td>

                    {/* Scheduled Date */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">
                        {row.booking_date ? format(new Date(row.booking_date), 'MMM d, yyyy') : '—'}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {row.booking_date ? format(new Date(row.booking_date), 'h:mm a') : ''}
                      </div>
                    </td>

                    {/* Location */}
                    <td className="px-4 py-3 max-w-[180px] truncate" title={row.location}>
                      <span className="text-gray-700">{row.location || '—'}</span>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3 text-right font-extrabold text-[#07535f]">
                      Rs. {Number(row.amount_paid || row.total_price || 650).toLocaleString()}
                    </td>

                    {/* Payment Status */}
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        row.payment_status === 'completed' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {row.payment_status ? row.payment_status.toUpperCase() : 'PENDING'}
                      </span>
                    </td>

                    {/* Rating */}
                    <td className="px-4 py-3 text-center">
                      {row.review_rating ? (
                        <div className="inline-flex items-center gap-1 font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200" title={row.review_comment}>
                          {row.review_rating} <Star className="w-3 h-3 fill-amber-400" />
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Footer & Pagination ── */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 font-medium">
          <div>
            Showing <span className="font-bold text-gray-800">{paginatedData.length}</span> of <span className="font-bold text-gray-800">{sortedData.length}</span> records
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-bold text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
