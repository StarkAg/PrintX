import React, { useState, useEffect } from 'react';
import Head from 'next/head';

const FileThumbnail = ({ file }: { file: Order['files'][0] }) => {
  if (file.thumbnailPath) {
    return (
      <img
        src={`/${file.thumbnailPath}`}
        alt={file.name}
        className="w-12 h-12 object-cover rounded-md border border-gray"
      />
    );
  }

  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') {
    return (
      <span className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-red-600/80 border border-red-400 text-[10px] font-bold text-white">
        PDF
      </span>
    );
  }

  return (
    <span className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-gray-700 border border-gray-500 text-[10px] font-semibold text-white">
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

export default function Admin() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // TODO: Add authentication in production
  // This admin dashboard is not protected and should not be deployed to production without auth

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/order');
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

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
        alert('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order status');
    } finally {
      setUpdating(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Head>
        <title>PrintX Admin Dashboard</title>
        <meta name="description" content="Admin dashboard for PrintX orders" />
      </Head>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Admin Dashboard</h1>
          <button
            onClick={fetchOrders}
            className="bg-card border border-gray px-4 py-2 rounded-lg hover:bg-card-hover transition-colors"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-400">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No orders yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full bg-card border border-gray rounded-lg">
              <thead>
                <tr className="border-b border-gray">
                  <th className="px-6 py-4 text-left text-white font-semibold">
                    Order ID
                  </th>
                  <th className="px-6 py-4 text-left text-white font-semibold">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-white font-semibold">
                    Files
                  </th>
                  <th className="px-6 py-4 text-left text-white font-semibold">
                    Total
                  </th>
                  <th className="px-6 py-4 text-left text-white font-semibold">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-white font-semibold">
                    Payment
                  </th>
                  <th className="px-6 py-4 text-left text-white font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.orderId}
                    className="border-b border-gray hover:bg-card-hover"
                  >
                    <td className="px-6 py-4 text-gray-300 font-mono text-sm">
                      {order.orderId.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      <div className="space-y-2">
                        {order.files.map((file) => (
                          <div
                            key={`${order.orderId}-${file.name}`}
                            className="flex items-center gap-2"
                          >
                            <FileThumbnail file={file} />
                            <span className="truncate max-w-[160px]">
                              {file.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-white font-semibold">
                      ₹{order.total}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${
                          order.status === 'Fulfilled'
                            ? 'bg-green-900 text-green-300'
                            : 'bg-yellow-900 text-yellow-300'
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
                          className="text-accent-yellow hover:underline"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-gray-500">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {order.status === 'Pending' && (
                        <button
                          onClick={() => handleMarkFulfilled(order.orderId)}
                          disabled={updating === order.orderId}
                          className="bg-white text-black px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg border-2 border-white hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm"
                        >
                          {updating === order.orderId
                            ? 'Updating...'
                            : 'Mark Fulfilled'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-8 p-4 bg-yellow-900 border border-yellow-700 rounded-lg">
          <p className="text-yellow-200 text-sm">
            ⚠️ <strong>Security Warning:</strong> This admin dashboard is not
            protected by authentication. Do not deploy to production without
            adding proper authentication and authorization.
          </p>
        </div>
      </main>
    </div>
  );
}

