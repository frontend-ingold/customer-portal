import { useEffect, useRef, useState } from 'react';
import { CheckCircleIcon, ClockIcon, ViewIcon } from '../components/Icons';
import { fetchOrdersByCardCode } from '../services/sapServiceLayer';

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
                    <button className="orders-view-button" type="button">
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
