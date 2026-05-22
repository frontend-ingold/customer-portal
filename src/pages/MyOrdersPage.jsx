import { useEffect, useRef, useState } from 'react';
import { CheckCircleIcon, ClockIcon, ViewIcon } from '../components/Icons';
import {
  fetchOrderDetailsByDocNum,
  fetchOrdersByCardCode,
  isSessionExpiredError,
} from '../services/sapServiceLayer';

const PAGE_SIZE = 20;
const SCROLL_LOAD_THRESHOLD = 320;

export default function MyOrdersPage({ orders = [], currency = 'USD', cardCode = '' }) {
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    status: 'All',
    sapOrderId: '',
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [loadedOrders, setLoadedOrders] = useState([]);
  const [nextSkip, setNextSkip] = useState(0);
  const [hasMoreOrders, setHasMoreOrders] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const nextSkipRef = useRef(0);
  const hasMoreOrdersRef = useRef(true);
  const isLoadingOrdersRef = useRef(false);
  const appliedFiltersRef = useRef(appliedFilters);
  const scrollLoadArmedRef = useRef(true);
  const pendingScrollOrderKeyRef = useRef(null);
  const orderRowRefs = useRef(new Map());
  const sourceOrders = cardCode ? loadedOrders : orders;
  const normalizedOrders = sourceOrders.map((order, index) => (
    normalizeOrder(order, index, currency)
  ));
  const hasActiveFilters = filters.fromDate || filters.toDate || filters.status !== 'All' || filters.sapOrderId;

  useEffect(() => {
    let isCurrent = true;

    async function loadFirstPage() {
      if (!cardCode) {
        return;
      }

      setLoadingOrders(true);
      setLoadedOrders([]);
      updateNextSkip(0);
      updateHasMoreOrders(true);
      setOrdersError('');

      try {
        const nextOrders = await fetchOrdersByCardCode(cardCode, {
          ...appliedFilters,
          top: PAGE_SIZE,
          skip: 0,
        });

        if (!isCurrent) {
          return;
        }

        setLoadedOrders(nextOrders);
        updateNextSkip(nextOrders.length);
        updateHasMoreOrders(nextOrders.length === PAGE_SIZE);
      } catch (error) {
        if (isCurrent) {
          if (isSessionExpiredError(error)) {
            setLoadedOrders([]);
            updateHasMoreOrders(false);
            setOrdersError('');
            return;
          }

          setLoadedOrders([]);
          updateHasMoreOrders(false);
          setOrdersError(error.message || 'Unable to load orders.');
        }
      } finally {
        if (isCurrent) {
          setLoadingOrders(false);
        }
      }
    }

    loadFirstPage();

    return () => {
      isCurrent = false;
    };
  }, [appliedFilters, cardCode]);

  useEffect(() => {
    appliedFiltersRef.current = appliedFilters;
  }, [appliedFilters]);

  useEffect(() => {
    if (!pendingScrollOrderKeyRef.current) {
      return undefined;
    }

    const orderKey = pendingScrollOrderKeyRef.current;
    const animationFrame = window.requestAnimationFrame(() => {
      const row = orderRowRefs.current.get(orderKey);

      if (row) {
        row.scrollIntoView({
          block: 'start',
        });
      }

      pendingScrollOrderKeyRef.current = null;
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [normalizedOrders.length]);

  useEffect(() => {
    if (!cardCode) {
      return undefined;
    }

    let animationFrame = 0;

    function handleScroll() {
      if (animationFrame) {
        return;
      }

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = 0;
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const viewportHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const distanceFromBottom = documentHeight - (scrollTop + viewportHeight);
        const isNearBottom = distanceFromBottom <= SCROLL_LOAD_THRESHOLD;

        if (!isNearBottom) {
          scrollLoadArmedRef.current = true;
          return;
        }

        if (!scrollLoadArmedRef.current) {
          return;
        }

        scrollLoadArmedRef.current = false;
        loadNextPage();
      });
    }

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [cardCode]);

  async function loadNextPage() {
    if (!cardCode || isLoadingOrdersRef.current || !hasMoreOrdersRef.current) {
      return;
    }

    const currentSkip = nextSkipRef.current;
    setLoadingOrders(true);
    setOrdersError('');
    scrollLoadArmedRef.current = false;

    try {
      const nextOrders = await fetchOrdersByCardCode(cardCode, {
        ...appliedFiltersRef.current,
        top: PAGE_SIZE,
        skip: currentSkip,
      });

      if (nextOrders.length) {
        pendingScrollOrderKeyRef.current = normalizeOrder(nextOrders[0], currentSkip, currency).key;
      }

      setLoadedOrders((current) => [...current, ...nextOrders]);
      updateNextSkip(currentSkip + nextOrders.length);
      updateHasMoreOrders(nextOrders.length === PAGE_SIZE);
    } catch (error) {
      if (isSessionExpiredError(error)) {
        setOrdersError('');
        updateHasMoreOrders(false);
        return;
      }

      setOrdersError(error.message || 'Unable to load more orders.');
      updateHasMoreOrders(false);
    } finally {
      setLoadingOrders(false);
    }
  }

  function setLoadingOrders(value) {
    isLoadingOrdersRef.current = value;
    setIsLoadingOrders(value);
  }

  function updateNextSkip(value) {
    nextSkipRef.current = value;
    setNextSkip(value);
  }

  function updateHasMoreOrders(value) {
    hasMoreOrdersRef.current = value;
    setHasMoreOrders(value);
  }

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleClearFilters() {
    const emptyFilters = {
      fromDate: '',
      toDate: '',
      status: 'All',
      sapOrderId: '',
    };

    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    updateNextSkip(0);
    updateHasMoreOrders(true);
    scrollLoadArmedRef.current = true;
  }

  function handleApplyFilters(event) {
    event.preventDefault();
    setAppliedFilters(filters);
    updateNextSkip(0);
    updateHasMoreOrders(true);
    scrollLoadArmedRef.current = true;
  }

  if (selectedOrder) {
    return (
      <OrderDetailsPage
        key={selectedOrder.key}
        order={selectedOrder}
        currency={currency}
        onBack={() => setSelectedOrder(null)}
      />
    );
  }

  return (
    <div className="my-orders-page">
      <form className="orders-filter-bar" onSubmit={handleApplyFilters}>
        <label className="orders-filter-field">
          <span>From Date</span>
          <input
            type="date"
            name="fromDate"
            value={filters.fromDate}
            aria-label="From Date"
            onChange={handleFilterChange}
          />
        </label>
        <label className="orders-filter-field">
          <span>To Date</span>
          <input
            type="date"
            name="toDate"
            value={filters.toDate}
            aria-label="To Date"
            onChange={handleFilterChange}
          />
        </label>
        <label className="orders-filter-field">
          <span>Status</span>
          <select
            name="status"
            value={filters.status}
            aria-label="Status"
            onChange={handleFilterChange}
          >
            <option>All</option>
            <option>Open</option>
            <option>Delivered</option>
          </select>
        </label>
        <label className="orders-filter-field">
          <span>Order ID (SAP)</span>
          <input
            type="text"
            name="sapOrderId"
            value={filters.sapOrderId}
            aria-label="Order ID (SAP)"
            placeholder="e.g. 12345678"
            onChange={handleFilterChange}
          />
        </label>
        <div className="orders-filter-actions">
          <button className="orders-filter-apply" type="submit">
            Apply
          </button>
          {hasActiveFilters ? (
            <button className="orders-filter-clear" type="button" onClick={handleClearFilters}>
              Clear
            </button>
          ) : null}
        </div>
      </form>
      <div className="orders-table-shell">
        <div className="orders-table-wrap">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order ID (SAP)</th>
                <th>Order ID (Online)</th>
                <th>Source</th>
                <th>Date</th>
                <th>Delivery Date</th>
                <th>Payment Terms</th>
                <th>Total</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {normalizedOrders.map((order) => (
                <tr
                  key={order.key}
                  ref={(node) => setOrderRowRef(order.key, node, orderRowRefs)}
                >
                  <td>{order.sapId}</td>
                  <td>{order.onlineId}</td>
                  <td>{order.source}</td>
                  <td>{order.date}</td>
                  <td>{order.deliveryDate}</td>
                  <td>{order.paymentTerms}</td>
                  <td>{order.total}</td>
                  <td>
                    <span className={`order-status-badge ${order.statusClass}`}>
                      {order.statusClass === 'delivered' ? <CheckCircleIcon /> : <ClockIcon />}
                      {order.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="orders-view-button"
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <ViewIcon />
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {isLoadingOrders ? <OrdersSkeletonRows /> : null}
            </tbody>
          </table>
          {!isLoadingOrders && !normalizedOrders.length ? (
            <div className="orders-table-message">No orders found.</div>
          ) : null}
          {ordersError ? (
            <div className="orders-table-message is-error">{ordersError}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function OrderDetailsPage({ order, currency, onBack }) {
  const [apiOrderDetails, setApiOrderDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const detail = buildOrderDetails(order, apiOrderDetails, currency);
  const shouldShowDetails = !isLoadingDetails || Boolean(apiOrderDetails) || Boolean(detailsError);

  useEffect(() => {
    let isCurrent = true;
    const docNum = Number(order.sapId);

    async function loadOrderDetails() {
      if (!Number.isFinite(docNum) || docNum <= 0) {
        return;
      }

      setIsLoadingDetails(true);
      setDetailsError('');
      setApiOrderDetails(null);

      try {
        const nextOrderDetails = await fetchOrderDetailsByDocNum(docNum);

        if (isCurrent) {
          setApiOrderDetails(nextOrderDetails);
        }
      } catch (error) {
        if (isCurrent) {
          if (isSessionExpiredError(error)) {
            setApiOrderDetails(null);
            setDetailsError('');
            return;
          }

          setApiOrderDetails(null);
          setDetailsError(error.message || 'Unable to load order details.');
        }
      } finally {
        if (isCurrent) {
          setIsLoadingDetails(false);
        }
      }
    }

    loadOrderDetails();

    return () => {
      isCurrent = false;
    };
  }, [order.sapId]);

  return (
    <div className="order-details-page">
      <header className="order-details-hero">
        <div className="order-hero-copy">
          <button className="order-details-back-link" type="button" onClick={onBack}>
            Back to orders
          </button>
          <h1>Order #{detail.sapId}</h1>
          <p>Online order {detail.onlineId} - {detail.source}</p>
        </div>
        <div className="order-hero-meta">
          <span>Order Date: {detail.orderDate}</span>
          <strong>{detail.total}</strong>
        </div>
      </header>
      {isLoadingDetails ? (
        <div className="order-detail-message">Loading order details...</div>
      ) : null}
      {detailsError ? (
        <div className="order-detail-message is-error">{detailsError}</div>
      ) : null}

      {shouldShowDetails ? (
        <>
          <section className="order-kpi-grid">
            <div>
              <span>Status</span>
              <strong>{detail.status}</strong>
            </div>
            <div>
              <span>Payment Method</span>
              <strong>{detail.paymentMethod}</strong>
            </div>
            <div>
              <span>Shipping Method</span>
              <strong>{detail.shippingMethod}</strong>
            </div>
            <div>
              <span>Delivery Date</span>
              <strong>{detail.deliveryDate}</strong>
            </div>
          </section>

          <section className="order-details-layout">
            <article className="order-detail-card">
              <div className="order-section-heading">
                <h2>Items</h2>
                <span>{detail.items.length} products</span>
              </div>
              <div className="order-items-table-wrap">
                <table className="order-items-table">
                  <thead>
                    <tr>
                      <th>Item Code</th>
                      <th>Sku</th>
                      <th>Price</th>
                      <th>Qty</th>
                      <th>Status</th>
                      <th>Delivery Date</th>
                      <th>Tax</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((item) => (
                      <tr key={item.itemCode}>
                        <td>
                          <strong>{item.itemCode}</strong>
                          <span>{item.description}</span>
                        </td>
                        <td>{item.sku}</td>
                        <td>{item.price}</td>
                        <td>{item.quantity}</td>
                        <td>
                          <span className="order-line-status">{item.status}</span>
                        </td>
                        <td>{item.deliveryDate}</td>
                        <td>{item.tax}</td>
                        <td>{item.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <aside className="order-total-summary">
              <h2>Totals</h2>
              <div>
                <span>Subtotal</span>
                <strong>{detail.subtotal}</strong>
              </div>
              <div>
                <span>Total Before Tax</span>
                <strong>{detail.subtotal}</strong>
              </div>
              <div>
                <span>Total Tax Amount</span>
                <strong>{detail.tax}</strong>
              </div>
              <div className="order-grand-total">
                <span>Grand Total</span>
                <strong>{detail.total}</strong>
              </div>
            </aside>
          </section>

          <section className="order-info-panel">
            <div className="order-section-heading">
              <h2>Order Information</h2>
              <span>Fulfillment details</span>
            </div>
            <div className="order-info-grid">
              {detail.infoCards.map((card) => (
                <article key={card.title}>
                  <h3>{card.title}</h3>
                  {card.lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function buildStaticOrderDetails(order, currency) {
  const subtotalValue = 102.77;

  return {
    ...order,
    subtotal: formatCurrency(subtotalValue, currency),
    tax: formatCurrency(0, currency),
    total: formatCurrency(subtotalValue, currency),
    orderDate: '10/09/2025',
    deliveryDate: '10/09/2025',
    status: 'Closed',
    paymentMethod: 'Invoice',
    shippingMethod: 'UPS Standard',
    infoCards: [
      {
        title: 'Shipping Address',
        lines: ['Bianco USA Magento', '5th avenue 123', 'Spring', '10011', 'United States'],
      },
      {
        title: 'Billing Address',
        lines: ['Bianco USA Magento', '5th avenue 123', 'New York', '125986', 'United States'],
      },
      {
        title: 'Shipping Method',
        lines: ['UPS Standard'],
      },
      {
        title: 'Payment Method',
        lines: ['Invoice'],
      },
    ],
    items: [
      {
        itemCode: 'h 8 190 w xs',
        sku: 'h 8 190 w xs',
        description: 'Reifrock mit elastischem Bund, Umf. 190 cm, ein Reifen.',
        price: formatCurrency(24.2, currency),
        quantity: 2,
        status: 'CLOSED',
        deliveryDate: '10/09/2025',
        tax: formatCurrency(0, currency),
        total: formatCurrency(38.72, currency),
      },
      {
        itemCode: 'star c 38',
        sku: 'star c 38',
        description: 'Brautschuhe der Marke AVALIA. Satin. Absatzhohe 6 cm',
        price: formatCurrency(64.05, currency),
        quantity: 1,
        status: 'CLOSED',
        deliveryDate: '10/09/2025',
        tax: formatCurrency(0, currency),
        total: formatCurrency(64.05, currency),
      },
    ],
  };
}

function buildOrderDetails(order, apiOrderDetails, currency) {
  if (!apiOrderDetails) {
    return buildStaticOrderDetails(order, currency);
  }

  const detailCurrency = apiOrderDetails.DocCurrency || currency;
  const docTotal = getNumber(apiOrderDetails.DocTotal);
  const taxTotal = getNumber(apiOrderDetails.VatSum);
  const subtotal = Math.max(docTotal - taxTotal, 0);
  const addressExtension = apiOrderDetails.AddressExtension || {};
  const documentLines = Array.isArray(apiOrderDetails.DocumentLines)
    ? apiOrderDetails.DocumentLines
    : [];
  const fallbackDetails = buildStaticOrderDetails(order, detailCurrency);

  return {
    sapId: apiOrderDetails.DocNum || order.sapId,
    onlineId: apiOrderDetails.NumAtCard || order.onlineId || '-',
    source: order.source || 'Internet-Shop',
    subtotal: formatCurrency(subtotal, detailCurrency),
    tax: formatCurrency(taxTotal, detailCurrency),
    total: formatCurrency(docTotal, detailCurrency),
    orderDate: formatCompactDate(apiOrderDetails.DocDate),
    deliveryDate: formatCompactDate(apiOrderDetails.DocDueDate),
    status: normalizeStatus(apiOrderDetails.DocumentStatus).label,
    paymentMethod: formatPaymentMethodName(apiOrderDetails.PaymentGroupCode),
    shippingMethod: formatShippingMethod(apiOrderDetails.TransportationCode),
    infoCards: [
      {
        title: 'Shipping Address',
        lines: buildAddressLines(
          addressExtension.ShipToStreet,
          addressExtension.ShipToCity,
          addressExtension.ShipToZipCode,
          addressExtension.ShipToCountry,
          apiOrderDetails.Address2,
        ),
      },
      {
        title: 'Billing Address',
        lines: buildAddressLines(
          addressExtension.BillToStreet,
          addressExtension.BillToCity,
          addressExtension.BillToZipCode,
          addressExtension.BillToCountry,
          apiOrderDetails.Address,
        ),
      },
      {
        title: 'Shipping Method',
        lines: [formatShippingMethod(apiOrderDetails.TransportationCode)],
      },
      {
        title: 'Payment Method',
        lines: [formatPaymentMethodName(apiOrderDetails.PaymentGroupCode)],
      },
    ],
    items: documentLines.length
      ? documentLines.map((line, index) => normalizeOrderLine(line, index, detailCurrency, apiOrderDetails.DocDueDate))
      : fallbackDetails.items,
  };
}

function normalizeOrderLine(line, index, currency, fallbackDeliveryDate) {
  const quantity = getNumber(line.Quantity);
  const lineTotal = getNumber(line.LineTotal);
  const taxTotal = getNumber(line.TaxTotal);
  const price = getNumber(line.UnitPrice ?? line.Price);

  return {
    itemCode: line.ItemCode || `Line ${index + 1}`,
    sku: line.ItemCode || '-',
    description: line.ItemDescription || line.ItemCode || '-',
    price: formatCurrency(price, currency),
    quantity,
    status: line.LineStatus === 'bost_Close' ? 'CLOSED' : 'OPEN',
    deliveryDate: formatCompactDate(line.ShipDate || fallbackDeliveryDate),
    tax: formatCurrency(taxTotal, currency),
    total: formatCurrency(lineTotal, currency),
  };
}

function buildAddressLines(street, city, zipCode, country, fallbackAddress) {
  const structuredLines = [
    street,
    city,
    zipCode,
    country,
  ].filter(Boolean);

  if (structuredLines.length) {
    return structuredLines;
  }

  if (!fallbackAddress) {
    return ['-'];
  }

  return String(fallbackAddress)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatShippingMethod(value) {
  if (!value && value !== 0) {
    return 'UPS Standard';
  }

  if (String(value) === '1') {
    return 'UPS Standard';
  }

  return String(value);
}

function formatPaymentMethodName(value) {
  if (!value && value !== 0) {
    return 'Invoice';
  }

  const paymentMethodNames = {
    '-1': 'Invoice',
    1: 'Invoice',
  };

  return paymentMethodNames[String(value)] || 'Invoice';
}

function getNumber(value) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : 0;
}

function setOrderRowRef(key, node, rowRefs) {
  if (node) {
    rowRefs.current.set(key, node);
    return;
  }

  rowRefs.current.delete(key);
}

function OrdersSkeletonRows() {
  return Array.from({ length: 3 }, (_, rowIndex) => (
    <tr className="orders-skeleton-row" key={`orders-skeleton-${rowIndex}`}>
      {Array.from({ length: 9 }, (_, cellIndex) => (
        <td key={`orders-skeleton-${rowIndex}-${cellIndex}`}>
          <span className="orders-skeleton-bar" />
        </td>
      ))}
    </tr>
  ));
}

function normalizeOrder(order, index, fallbackCurrency) {
  const status = normalizeStatus(order.status, order.statusClass);

  return {
    key: order.docEntry || order.id || index,
    sapId: stripHash(order.sapId || order.docNum || order.id),
    onlineId: stripHash(order.onlineId || order.reference || order.numAtCard || order.id),
    source: order.source || 'Internet-Shop',
    date: formatCompactDate(order.rawDocDate || order.docDate || order.date),
    deliveryDate: formatCompactDate(order.rawDocDueDate || order.docDueDate || order.deliveryDate || order.date),
    paymentTerms: order.paymentTerms || formatPaymentTerms(order.paymentGroupCode),
    total: order.amount || formatCurrency(order.total, order.currency || fallbackCurrency),
    status: status.label,
    statusClass: status.className,
  };
}

function normalizeStatus(status = '', statusClass = '') {
  if (statusClass === 'delivered' || status === 'Delivered' || status === 'Closed' || status === 'bost_Close') {
    return {
      label: status === 'Closed' || status === 'bost_Close' ? 'Delivered' : status || 'Delivered',
      className: 'delivered',
    };
  }

  if (statusClass === 'processing' || status === 'Open' || status === 'bost_Open') {
    return {
      label: 'Open',
      className: 'open',
    };
  }

  return {
    label: status || 'Open',
    className: statusClass || 'open',
  };
}

function stripHash(value) {
  if (!value) {
    return '-';
  }

  return String(value).replace(/^#/, '');
}

function formatPaymentTerms(value) {
  if (!value && value !== 0) {
    return '30 Days Net';
  }

  const numericValue = Number(value);

  if (!Number.isNaN(numericValue) && numericValue >= 0) {
    return `${numericValue} Days Net`;
  }

  return String(value);
}

function formatCompactDate(value) {
  if (!value || value === '-') {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatCurrency(value, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(value ?? 0);
  } catch {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value ?? 0);
  }
}
