import { useEffect, useState } from 'react';
import { CheckCircleIcon, DownloadIcon, ViewIcon } from '../components/Icons';
import {
  fetchInvoiceDetailsByDocNum,
  fetchInvoicesByCardCode,
  isSessionExpiredError,
} from '../services/sapServiceLayer';

export default function MyInvoicesPage({ invoices = [], cardCode = '', currency = 'USD' }) {
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    status: 'All',
    invoiceId: '',
    orderId: '',
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [loadedInvoices, setLoadedInvoices] = useState([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [invoicesError, setInvoicesError] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const sourceInvoices = cardCode ? loadedInvoices : invoices;
  const normalizedInvoices = sourceInvoices.map((invoice, index) => (
    normalizeInvoice(invoice, index, currency)
  ));
  const filteredInvoices = cardCode
    ? normalizedInvoices
    : normalizedInvoices.filter((invoice) => (
      doesInvoiceMatchFilters(invoice, appliedFilters)
    ));
  const hasActiveFilters = filters.fromDate
    || filters.toDate
    || filters.status !== 'All'
    || filters.invoiceId
    || filters.orderId;

  useEffect(() => {
    let isCurrent = true;

    async function loadInvoices() {
      if (!cardCode) {
        return;
      }

      setIsLoadingInvoices(true);
      setInvoicesError('');

      try {
        const nextInvoices = await fetchInvoicesByCardCode(cardCode, appliedFilters);

        if (isCurrent) {
          setLoadedInvoices(nextInvoices);
        }
      } catch (error) {
        if (isCurrent) {
          if (isSessionExpiredError(error)) {
            setLoadedInvoices([]);
            setInvoicesError('');
            return;
          }

          setLoadedInvoices([]);
          setInvoicesError(error.message || 'Unable to load invoices.');
        }
      } finally {
        if (isCurrent) {
          setIsLoadingInvoices(false);
        }
      }
    }

    loadInvoices();

    return () => {
      isCurrent = false;
    };
  }, [appliedFilters, cardCode]);

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleApplyFilters(event) {
    event.preventDefault();
    setAppliedFilters(filters);
  }

  function handleClearFilters() {
    const emptyFilters = {
      fromDate: '',
      toDate: '',
      status: 'All',
      invoiceId: '',
      orderId: '',
    };

    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  }

  if (selectedInvoice) {
    return (
      <InvoiceDetailsPage
        key={selectedInvoice.invoiceId}
        invoice={selectedInvoice}
        currency={currency}
        onBack={() => setSelectedInvoice(null)}
      />
    );
  }

  return (
    <div className="my-invoices-page">
      <form className="invoices-filter-bar" onSubmit={handleApplyFilters}>
        <label className="invoices-filter-field">
          <span>From Date</span>
          <input
            type="date"
            name="fromDate"
            value={filters.fromDate}
            aria-label="From Date"
            onChange={handleFilterChange}
          />
        </label>
        <label className="invoices-filter-field">
          <span>To Date</span>
          <input
            type="date"
            name="toDate"
            value={filters.toDate}
            aria-label="To Date"
            onChange={handleFilterChange}
          />
        </label>
        <label className="invoices-filter-field">
          <span>Status</span>
          <select
            name="status"
            value={filters.status}
            aria-label="Status"
            onChange={handleFilterChange}
          >
            <option>All</option>
            <option>Paid</option>
            <option>Open</option>
          </select>
        </label>
        <label className="invoices-filter-field">
          <span>Invoice ID</span>
          <input
            type="text"
            name="invoiceId"
            value={filters.invoiceId}
            aria-label="Invoice ID"
            placeholder="e.g. 12345"
            onChange={handleFilterChange}
          />
        </label>
        <label className="invoices-filter-field">
          <span>Order ID</span>
          <input
            type="text"
            name="orderId"
            value={filters.orderId}
            aria-label="Order ID"
            placeholder="e.g. ORD001"
            onChange={handleFilterChange}
          />
        </label>
        <div className="invoices-filter-actions">
          <button className="invoices-filter-apply" type="submit">
            Apply
          </button>
          {hasActiveFilters ? (
            <button className="invoices-filter-clear" type="button" onClick={handleClearFilters}>
              Clear
            </button>
          ) : null}
        </div>
      </form>
      <div className="invoices-table-shell">
        <div className="invoices-table-wrap">
          <table className="invoices-table">
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Order ID (Online)</th>
                <th>Date</th>
                <th>Due Date</th>
                <th>Invoice Amount</th>
                <th>Paid Amount</th>
                <th>Due Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.key}>
                  <td>{invoice.invoiceId}</td>
                  <td>{invoice.orderIdOnline}</td>
                  <td>{invoice.date}</td>
                  <td>{invoice.dueDate}</td>
                  <td>{invoice.invoiceAmount}</td>
                  <td>{invoice.paidAmount}</td>
                  <td>{invoice.dueAmount}</td>
                  <td>
                    <span className={`invoice-status-badge ${invoice.statusClass}`}>
                      <CheckCircleIcon />
                      {invoice.status}
                    </span>
                  </td>
                  <td>
                    <div className="invoice-actions">
                      <button
                        className="invoice-action-button"
                        type="button"
                        onClick={() => setSelectedInvoice(invoice)}
                      >
                        <ViewIcon />
                        View
                      </button>
                      <button className="invoice-action-button" type="button">
                        <DownloadIcon />
                        Download
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {isLoadingInvoices ? (
            <div className="invoices-table-message">Loading invoices...</div>
          ) : null}
          {!isLoadingInvoices && !filteredInvoices.length ? (
            <div className="invoices-table-message">No invoices found.</div>
          ) : null}
          {invoicesError ? (
            <div className="invoices-table-message is-error">{invoicesError}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InvoiceDetailsPage({ invoice, currency, onBack }) {
  const [apiInvoiceDetails, setApiInvoiceDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const detail = buildInvoiceDetails(invoice, apiInvoiceDetails, currency);
  const shouldShowDetails = !isLoadingDetails || Boolean(apiInvoiceDetails) || Boolean(detailsError);

  useEffect(() => {
    let isCurrent = true;
    const docNum = Number(invoice.invoiceId);

    async function loadInvoiceDetails() {
      if (!Number.isFinite(docNum) || docNum <= 0) {
        return;
      }

      setIsLoadingDetails(true);
      setDetailsError('');
      setApiInvoiceDetails(null);

      try {
        const nextInvoiceDetails = await fetchInvoiceDetailsByDocNum(docNum);

        if (isCurrent) {
          setApiInvoiceDetails(nextInvoiceDetails);
        }
      } catch (error) {
        if (isCurrent) {
          if (isSessionExpiredError(error)) {
            setApiInvoiceDetails(null);
            setDetailsError('');
            return;
          }

          setApiInvoiceDetails(null);
          setDetailsError(error.message || 'Unable to load invoice details.');
        }
      } finally {
        if (isCurrent) {
          setIsLoadingDetails(false);
        }
      }
    }

    loadInvoiceDetails();

    return () => {
      isCurrent = false;
    };
  }, [invoice.invoiceId]);

  return (
    <div className="invoice-details-page">
      <header className="invoice-details-hero">
        <div className="invoice-hero-copy">
          <button className="invoice-details-back-link" type="button" onClick={onBack}>
            Back to invoices
          </button>
          <h1>Invoice #{detail.invoiceId}</h1>
          <p>Online order {detail.orderIdOnline} - {detail.customerName}</p>
        </div>
        <div className="invoice-hero-meta">
          <span>Invoice Date: {detail.date}</span>
          <strong>{detail.invoiceAmount}</strong>
        </div>
      </header>

      {isLoadingDetails ? (
        <div className="invoice-detail-message">Loading invoice details...</div>
      ) : null}
      {detailsError ? (
        <div className="invoice-detail-message is-error">{detailsError}</div>
      ) : null}

      {shouldShowDetails ? (
        <>
          <section className="invoice-kpi-grid">
            <div>
              <span>Status</span>
              <strong>{detail.status}</strong>
            </div>
            <div>
              <span>Payment Method</span>
              <strong>{detail.paymentMethod}</strong>
            </div>
            <div>
              <span>Paid Amount</span>
              <strong>{detail.paidAmount}</strong>
            </div>
            <div>
              <span>Due Date</span>
              <strong>{detail.dueDate}</strong>
            </div>
          </section>

          <section className="invoice-details-layout">
            <article className="invoice-detail-card">
              <div className="invoice-section-heading">
                <h2>Items</h2>
                <span>{detail.items.length} products</span>
              </div>
              <div className="invoice-items-table-wrap">
                <table className="invoice-items-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Sku</th>
                      <th>Price</th>
                      <th>Qty</th>
                      <th>Discount Amount</th>
                      <th>Delivery Number</th>
                      <th>Unit of measure</th>
                      <th>Tax</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((item) => (
                      <tr key={`${item.itemCode}-${item.lineNum}`}>
                        <td>
                          <strong>{item.itemCode}</strong>
                          <span>{item.description}</span>
                        </td>
                        <td>{item.sku}</td>
                        <td>{item.price}</td>
                        <td>{item.quantity}</td>
                        <td>{item.discountAmount}</td>
                        <td>{item.deliveryNumber}</td>
                        <td>{item.unitOfMeasure}</td>
                        <td>{item.tax}</td>
                        <td>{item.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <aside className="invoice-total-summary">
              <h2>Totals</h2>
              <div>
                <span>Subtotal</span>
                <strong>{detail.subtotal}</strong>
              </div>
              <div>
                <span>Total Tax Amount</span>
                <strong>{detail.tax}</strong>
              </div>
              <div>
                <span>Paid Amount</span>
                <strong>{detail.paidAmount}</strong>
              </div>
              <div className="invoice-grand-total">
                <span>Due Amount</span>
                <strong>{detail.dueAmount}</strong>
              </div>
            </aside>
          </section>

          <section className="invoice-info-panel">
            <div className="invoice-section-heading">
              <h2>Invoice Information</h2>
              <span>Billing details</span>
            </div>
            <div className="invoice-info-grid">
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

function normalizeInvoice(invoice, index, currency) {
  const invoiceTotal = getNumber(invoice.invoiceAmount ?? invoice.docTotal ?? invoice.total);
  const paidTotal = getNumber(invoice.paidAmount ?? invoice.paidToDate);
  const dueTotal = getNumber(invoice.dueAmount ?? invoice.openAmount ?? invoiceTotal - paidTotal);
  const status = normalizeStatus(invoice.status, dueTotal);

  return {
    key: invoice.docEntry || invoice.invoiceId || invoice.docNum || index,
    invoiceId: invoice.invoiceId || invoice.docNum || '-',
    orderIdOnline: invoice.orderIdOnline || invoice.reference || invoice.numAtCard || '-',
    rawDate: getDateInputValue(invoice.date || invoice.docDate),
    date: formatCompactDate(invoice.date || invoice.docDate),
    dueDate: formatCompactDate(invoice.dueDate || invoice.docDueDate),
    invoiceAmount: typeof invoice.invoiceAmount === 'string'
      ? invoice.invoiceAmount
      : formatCurrency(invoiceTotal, invoice.currency || currency),
    paidAmount: typeof invoice.paidAmount === 'string'
      ? invoice.paidAmount
      : formatCurrency(paidTotal, invoice.currency || currency),
    dueAmount: typeof invoice.dueAmount === 'string'
      ? invoice.dueAmount
      : formatCurrency(Math.max(dueTotal, 0), invoice.currency || currency),
    status: status.label,
    statusClass: status.className,
  };
}

function buildInvoiceDetails(invoice, apiInvoiceDetails, currency) {
  if (!apiInvoiceDetails) {
    return buildStaticInvoiceDetails(invoice, currency);
  }

  const detailCurrency = apiInvoiceDetails.DocCurrency || currency;
  const docTotal = getNumber(apiInvoiceDetails.DocTotal);
  const paidTotal = getNumber(apiInvoiceDetails.PaidToDate);
  const taxTotal = getNumber(apiInvoiceDetails.VatSum);
  const dueTotal = Math.max(docTotal - paidTotal, 0);
  const subtotal = Math.max(docTotal - taxTotal, 0);
  const status = normalizeStatus(apiInvoiceDetails.DocumentStatus, dueTotal);
  const addressExtension = apiInvoiceDetails.AddressExtension || {};
  const documentLines = Array.isArray(apiInvoiceDetails.DocumentLines)
    ? apiInvoiceDetails.DocumentLines
    : [];
  const fallbackDetails = buildStaticInvoiceDetails(invoice, detailCurrency);

  return {
    invoiceId: apiInvoiceDetails.DocNum || invoice.invoiceId,
    orderIdOnline: apiInvoiceDetails.NumAtCard || invoice.orderIdOnline || '-',
    customerName: apiInvoiceDetails.CardName || '-',
    date: formatCompactDate(apiInvoiceDetails.DocDate),
    dueDate: formatCompactDate(apiInvoiceDetails.DocDueDate),
    invoiceAmount: formatCurrency(docTotal, detailCurrency),
    paidAmount: formatCurrency(paidTotal, detailCurrency),
    dueAmount: formatCurrency(dueTotal, detailCurrency),
    subtotal: formatCurrency(subtotal, detailCurrency),
    tax: formatCurrency(taxTotal, detailCurrency),
    status: status.label,
    paymentMethod: 'Invoice',
    infoCards: [
      {
        title: 'Billing Address',
        lines: buildAddressLines(
          addressExtension.BillToStreet,
          addressExtension.BillToCity,
          addressExtension.BillToZipCode,
          addressExtension.BillToCountry,
          apiInvoiceDetails.Address,
        ),
      },
      {
        title: 'Shipping Address',
        lines: buildAddressLines(
          addressExtension.ShipToStreet,
          addressExtension.ShipToCity,
          addressExtension.ShipToZipCode,
          addressExtension.ShipToCountry,
          apiInvoiceDetails.Address2,
        ),
      },
      {
        title: 'Payment Method',
        lines: ['Invoice'],
      },
      {
        title: 'Customer',
        lines: [apiInvoiceDetails.CardName || '-'],
      },
    ],
    items: documentLines.length
      ? documentLines.map((line, index) => normalizeInvoiceLine(line, index, detailCurrency))
      : fallbackDetails.items,
  };
}

function buildStaticInvoiceDetails(invoice, currency) {
  const invoiceTotal = getNumber(invoice.invoiceAmount);
  const paidTotal = getNumber(invoice.paidAmount);
  const dueTotal = getNumber(invoice.dueAmount);
  const fallbackTotal = invoiceTotal || paidTotal + dueTotal || 282.97;

  return {
    invoiceId: invoice.invoiceId,
    orderIdOnline: invoice.orderIdOnline,
    customerName: '-',
    date: invoice.date,
    dueDate: invoice.dueDate,
    invoiceAmount: invoice.invoiceAmount || formatCurrency(fallbackTotal, currency),
    paidAmount: invoice.paidAmount || formatCurrency(paidTotal, currency),
    dueAmount: invoice.dueAmount || formatCurrency(dueTotal, currency),
    subtotal: formatCurrency(fallbackTotal, currency),
    tax: formatCurrency(0, currency),
    status: invoice.status,
    paymentMethod: 'Invoice',
    infoCards: [
      {
        title: 'Billing Address',
        lines: ['-'],
      },
      {
        title: 'Shipping Address',
        lines: ['-'],
      },
      {
        title: 'Payment Method',
        lines: ['Invoice'],
      },
      {
        title: 'Customer',
        lines: ['-'],
      },
    ],
    items: [
      {
        lineNum: 0,
        itemCode: 'Invoice item',
        sku: '-',
        description: 'Invoice details will appear here when available.',
        price: formatCurrency(fallbackTotal, currency),
        quantity: 1,
        discountAmount: formatCurrency(0, currency),
        deliveryNumber: '-',
        unitOfMeasure: '-',
        tax: formatCurrency(0, currency),
        total: invoice.invoiceAmount || formatCurrency(fallbackTotal, currency),
      },
    ],
  };
}

function normalizeInvoiceLine(line, index, currency) {
  const lineTotal = getNumber(line.LineTotal);
  const taxTotal = getNumber(line.TaxTotal);

  return {
    lineNum: line.LineNum ?? index,
    itemCode: line.ItemCode || `Line ${index + 1}`,
    sku: line.ItemCode || '-',
    description: line.ItemDescription || line.ItemCode || '-',
    price: formatCurrency(getNumber(line.UnitPrice ?? line.Price), currency),
    quantity: getNumber(line.Quantity),
    discountAmount: formatCurrency(getLineDiscountAmount(line), currency),
    deliveryNumber: getDeliveryNumber(line),
    unitOfMeasure: line.MeasureUnit || line.UoMCode || '-',
    tax: formatCurrency(taxTotal, currency),
    total: formatCurrency(lineTotal, currency),
  };
}

function getLineDiscountAmount(line) {
  const explicitDiscount = getNumber(line.DiscountAmount ?? line.TotalDiscount);

  if (explicitDiscount) {
    return explicitDiscount;
  }

  const discountPercent = getNumber(line.DiscountPercent);
  const price = getNumber(line.UnitPrice ?? line.Price);
  const quantity = getNumber(line.Quantity);

  if (!discountPercent || !price || !quantity) {
    return 0;
  }

  return (price * quantity * discountPercent) / 100;
}

function getDeliveryNumber(line) {
  return line.BaseRef || line.BaseEntry || line.BaseDocNum || '-';
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

function doesInvoiceMatchFilters(invoice, filters) {
  const invoiceDate = invoice.rawDate;
  const invoiceId = String(invoice.invoiceId ?? '').toLowerCase();
  const orderId = String(invoice.orderIdOnline ?? '').toLowerCase();

  if (filters.fromDate && invoiceDate && invoiceDate < filters.fromDate) {
    return false;
  }

  if (filters.toDate && invoiceDate && invoiceDate > filters.toDate) {
    return false;
  }

  if (filters.status !== 'All' && invoice.status !== filters.status) {
    return false;
  }

  if (filters.invoiceId && !invoiceId.includes(filters.invoiceId.trim().toLowerCase())) {
    return false;
  }

  if (filters.orderId && !orderId.includes(filters.orderId.trim().toLowerCase())) {
    return false;
  }

  return true;
}

function normalizeStatus(status = '', dueAmount = 0) {
  const normalizedStatus = String(status).toLowerCase();

  if (normalizedStatus === 'paid' || dueAmount <= 0) {
    return {
      label: 'Paid',
      className: 'paid',
    };
  }

  return {
    label: status || 'Open',
    className: 'open',
  };
}

function getNumber(value) {
  if (typeof value === 'number') {
    return value;
  }

  const number = Number.parseFloat(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(number) ? number : 0;
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

function getDateInputValue(value) {
  if (!value || value === '-') {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
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
