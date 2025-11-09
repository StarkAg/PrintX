import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';

const FileThumbnail = ({ file }: { file: Order['files'][0] }) => {
  if (file.thumbnailPath) {
    return (
      <img
        src={`/${file.thumbnailPath}`}
        alt={file.name}
        className="w-12 h-12 object-cover rounded-md border border-gray shadow-sm"
        onError={(e) => {
          (e.target as HTMLImageElement).src = '/file.svg';
        }}
      />
    );
  }

  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') {
    return (
      <span className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-black border border-white text-[10px] font-bold text-white shadow-sm">
        PDF
      </span>
    );
  }

  return (
    <span className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-black border border-gray-600 text-[10px] font-semibold text-white shadow-sm">
      IMG
    </span>
  );
};

interface Order {
  orderId: string;
  files: Array<{
    name: string;
    options: {
      format: string;
      color: string;
      paperGSM: string;
      binding?: string;
    };
    driveId: string;
    thumbnailPath?: string;
  }>;
  total: number;
  vpa: string;
  paymentScreenshotDriveId: string;
  paymentScreenshotPath?: string;
  createdAt: string;
  status: 'Pending' | 'Fulfilled';
}

interface Stats {
  total: number;
  pending: number;
  fulfilled: number;
  totalRevenue: number;
}

export default function Admin() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Fulfilled'>('All');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Calculate stats
  const stats: Stats = orders.reduce(
    (acc, order) => {
      acc.total++;
      if (order.status === 'Pending') acc.pending++;
      if (order.status === 'Fulfilled') acc.fulfilled++;
      acc.totalRevenue += order.total;
      return acc;
    },
    { total: 0, pending: 0, fulfilled: 0, totalRevenue: 0 }
  );

  // Fetch orders function
  const fetchOrders = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/order', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
        setLastRefresh(new Date());
      } else {
        throw new Error('Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to load orders. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchOrders();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchOrders]);

  // Filter and sort orders
  useEffect(() => {
    let filtered = [...orders];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.orderId.toLowerCase().includes(query) ||
          order.files.some((f) => f.name.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'amount') {
        comparison = a.total - b.total;
      } else if (sortBy === 'status') {
        comparison = a.status.localeCompare(b.status);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredOrders(filtered);
  }, [orders, searchQuery, statusFilter, sortBy, sortOrder]);

  // Handle mark fulfilled
  const handleMarkFulfilled = async (orderId: string) => {
    setUpdating(orderId);
    try {
      const response = await fetch('/api/order', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          status: 'Fulfilled',
        }),
      });

      if (response.ok) {
        await fetchOrders();
      } else {
        throw new Error('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order status. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format full date
  const formatFullDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Export orders as CSV
  const exportToCSV = () => {
    const headers = ['Order ID', 'Date', 'Status', 'Total (₹)', 'Files', 'Payment'];
    const rows = filteredOrders.map((order) => [
      order.orderId,
      formatFullDate(order.createdAt),
      order.status,
      order.total.toFixed(2),
      order.files.map((f) => f.name).join('; '),
      order.paymentScreenshotPath ? 'Yes' : 'No',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `printx-orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Head>
        <title>PrintX Admin Dashboard</title>
        <meta name="description" content="Professional admin dashboard for PrintX orders" />
      </Head>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-gray-800">Admin Dashboard</h1>
            <p className="text-white/70 text-sm">
              Last updated: {formatDate(lastRefresh.toISOString())}
              {autoRefresh && ` • Auto-refresh: ${refreshInterval}s`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={fetchOrders}
              disabled={loading}
              className="bg-gray-800 border border-gray-600 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-white"
            >
              <svg
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
            <button
              onClick={exportToCSV}
              disabled={filteredOrders.length === 0}
              className="bg-white text-black px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Export CSV
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-gray-800/20 border border-gray-800 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-white">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-gray-800 hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 hover:bg-gray-700 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">Total Orders</p>
                <p className="text-3xl font-bold text-white">{stats.total}</p>
              </div>
              <div className="bg-black/30 p-3 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 hover:bg-gray-700 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">Pending</p>
                <p className="text-3xl font-bold text-white">{stats.pending}</p>
              </div>
              <div className="bg-black/30 p-3 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 hover:bg-gray-700 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">Fulfilled</p>
                <p className="text-3xl font-bold text-white">{stats.fulfilled}</p>
              </div>
              <div className="bg-black/30 p-3 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white border border-black/20 rounded-lg p-6 hover:bg-gray-200 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-black/80 text-sm mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-black">₹{stats.totalRevenue.toFixed(2)}</p>
              </div>
              <div className="bg-black/20 p-3 rounded-lg">
                <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/70"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search by Order ID or filename..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-black border border-gray-600 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white transition-colors"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="px-4 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:border-white transition-colors"
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Fulfilled">Fulfilled</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-4 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:border-white transition-colors"
              >
                <option value="date">Sort by Date</option>
                <option value="amount">Sort by Amount</option>
                <option value="status">Sort by Status</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-4 py-2 bg-black border border-gray-600 rounded-lg hover:bg-black/80 transition-colors"
                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                <svg
                  className={`w-5 h-5 text-white ${sortOrder === 'desc' ? 'transform rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                  />
                </svg>
              </button>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 rounded bg-black border-gray-600 text-white focus:ring-2 focus:ring-gray-500"
              />
              <span className="text-sm text-white/90">Auto-refresh</span>
            </label>
            {autoRefresh && (
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="px-3 py-1 bg-black border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-white"
              >
                <option value="10">Every 10s</option>
                <option value="30">Every 30s</option>
                <option value="60">Every 1m</option>
                <option value="300">Every 5m</option>
              </select>
            )}
            <span className="text-sm text-white/70">
              Showing {filteredOrders.length} of {orders.length} orders
            </span>
          </div>
        </div>

        {/* Orders Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-800 border-t-transparent mb-4"></div>
            <p className="text-white/70">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 border border-gray-600 rounded-lg">
            <svg
              className="w-16 h-16 text-white/50 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <p className="text-white text-lg mb-2">
              {orders.length === 0 ? 'No orders yet' : 'No orders match your filters'}
            </p>
            {orders.length > 0 && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('All');
                }}
                className="text-white hover:text-gray-200 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto bg-gray-800 border border-gray-600 rounded-lg">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-600 bg-black/30">
                  <th className="px-6 py-4 text-left text-white font-semibold text-sm">Order ID</th>
                  <th className="px-6 py-4 text-left text-white font-semibold text-sm">Date</th>
                  <th className="px-6 py-4 text-left text-white font-semibold text-sm">Files</th>
                  <th className="px-6 py-4 text-left text-white font-semibold text-sm">Options</th>
                  <th className="px-6 py-4 text-left text-white font-semibold text-sm">Total</th>
                  <th className="px-6 py-4 text-left text-white font-semibold text-sm">Status</th>
                  <th className="px-6 py-4 text-left text-white font-semibold text-sm">Payment</th>
                  <th className="px-6 py-4 text-left text-white font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, index) => (
                  <tr
                    key={order.orderId}
                    className="border-b border-gray-600 hover:bg-black/20 transition-colors"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="text-white hover:text-gray-200 font-mono text-sm hover:underline"
                      >
                        {order.orderId}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-white/90 text-sm">
                      <div>{formatDate(order.createdAt)}</div>
                      <div className="text-xs text-white/70">{formatFullDate(order.createdAt)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2 max-w-xs">
                        {order.files.slice(0, 3).map((file) => (
                          <div
                            key={`${order.orderId}-${file.name}`}
                            className="flex items-center gap-2"
                          >
                            <FileThumbnail file={file} />
                            <span className="truncate text-sm text-white/90" title={file.name}>
                              {file.name}
                            </span>
                          </div>
                        ))}
                        {order.files.length > 3 && (
                          <p className="text-xs text-white/70">+{order.files.length - 3} more</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-xs text-white/80">
                        {order.files[0] && (
                          <>
                            <div>{order.files[0].options.color} • {order.files[0].options.format}</div>
                            <div>{order.files[0].options.paperGSM}</div>
                            {order.files[0].options.binding && (
                              <div>{order.files[0].options.binding}</div>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-white font-semibold">₹{order.total.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          order.status === 'Fulfilled'
                            ? 'bg-black text-white border border-gray-600'
                            : 'bg-black text-white border border-white/50'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {order.paymentScreenshotPath ? (
                        <a
                          href={`/${order.paymentScreenshotPath}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white hover:text-gray-200 hover:underline flex items-center gap-1 text-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                          View
                        </a>
                      ) : (
                        <span className="text-white/50 text-sm">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {order.status === 'Pending' && (
                        <button
                          onClick={() => handleMarkFulfilled(order.orderId)}
                          disabled={updating === order.orderId}
                          className="bg-white text-black px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-all transform hover:scale-105 shadow-lg border-2 border-white hover:border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm"
                        >
                          {updating === order.orderId ? (
                            <span className="flex items-center gap-2">
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Updating...
                            </span>
                          ) : (
                            'Mark Fulfilled'
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Order Details Modal */}
        {selectedOrder && (
          <div
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedOrder(null)}
          >
            <div
              className="bg-gray-800 border border-gray-600 rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Order Details</h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-white/80 text-sm mb-1">Order ID</p>
                  <p className="font-mono text-white">{selectedOrder.orderId}</p>
                </div>
                <div>
                  <p className="text-white/80 text-sm mb-1">Date</p>
                  <p className="text-white">{formatFullDate(selectedOrder.createdAt)}</p>
                </div>
                <div>
                  <p className="text-white/80 text-sm mb-1">Status</p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                      selectedOrder.status === 'Fulfilled'
                        ? 'bg-black text-white border border-gray-600'
                        : 'bg-black text-white border border-white/50'
                    }`}
                  >
                    {selectedOrder.status}
                  </span>
                </div>
                <div>
                  <p className="text-white/80 text-sm mb-1">Total</p>
                  <p className="text-white text-2xl font-bold">₹{selectedOrder.total.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-white/80 text-sm mb-2">Files ({selectedOrder.files.length})</p>
                  <div className="space-y-2">
                    {selectedOrder.files.map((file, index) => (
                      <div
                        key={index}
                        className="bg-black border border-gray-600 rounded-lg p-4 flex items-start gap-4"
                      >
                        <FileThumbnail file={file} />
                        <div className="flex-1">
                          <p className="text-white font-semibold mb-2">{file.name}</p>
                          <div className="grid grid-cols-2 gap-2 text-sm text-white/90">
                            <div>
                              <span className="text-white/70">Format:</span> {file.options.format}
                            </div>
                            <div>
                              <span className="text-white/70">Color:</span> {file.options.color}
                            </div>
                            <div>
                              <span className="text-white/70">Paper:</span> {file.options.paperGSM}
                            </div>
                            {file.options.binding && (
                              <div>
                                <span className="text-white/70">Binding:</span> {file.options.binding}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {selectedOrder.paymentScreenshotPath && (
                  <div>
                    <p className="text-white/80 text-sm mb-2">Payment Screenshot</p>
                    <a
                      href={`/${selectedOrder.paymentScreenshotPath}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-gray-200 hover:underline"
                    >
                      View Payment Screenshot
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Security Warning - Only show in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-black border border-white rounded-lg">
            <p className="text-white text-sm">
              ⚠️ <strong>Security Warning:</strong> This admin dashboard is not protected by
              authentication. Add proper authentication before deploying to production.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
