import { useEffect, useState } from 'react';
import { ViewIcon } from '../components/Icons';
import {
  fetchDeliveryNoteDetailsByDocNum,
  fetchDeliveryNotesByCardCode,
  isSessionExpiredError,
} from '../services/sapServiceLayer';

export default function MyShipmentsPage({ shipments = [], cardCode = '', currency = 'USD' }) {
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    shipmentSapNo: '',
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [loadedShipments, setLoadedShipments] = useState([]);
  const [isLoadingShipments, setIsLoadingShipments] = useState(false);
  const [shipmentsError, setShipmentsError] = useState('');
  const [selectedShipment, setSelectedShipment] = useState(null);
  const sourceShipments = cardCode ? loadedShipments : shipments;
  const normalizedShipments = sourceShipments.map((shipment) => (
    normalizeShipment(shipment, currency)
  ));
  const hasActiveFilters = filters.fromDate || filters.toDate || filters.shipmentSapNo;

  useEffect(() => {
    let isCurrent = true;

    async function loadShipments() {
      if (!cardCode) {
        return;
      }

      setIsLoadingShipments(true);
      setShipmentsError('');

      try {
        const nextShipments = await fetchDeliveryNotesByCardCode(cardCode, appliedFilters);

        if (isCurrent) {
          setLoadedShipments(nextShipments);
        }
      } catch (error) {
        if (isCurrent) {
          if (isSessionExpiredError(error)) {
            setLoadedShipments([]);
            setShipmentsError('');
            return;
          }

          setLoadedShipments([]);
          setShipmentsError(error.message || 'Unable to load shipments.');
        }
      } finally {
        if (isCurrent) {
          setIsLoadingShipments(false);
        }
      }
    }

    loadShipments();

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
      shipmentSapNo: '',
    };

    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  }

  if (selectedShipment) {
    return (
      <ShipmentDetailsPage
        key={selectedShipment.shipmentNoSap}
        shipment={selectedShipment}
        currency={currency}
        onBack={() => setSelectedShipment(null)}
      />
    );
  }

  return (
    <div className="my-shipments-page">
      <form className="shipments-filter-bar" onSubmit={handleApplyFilters}>
        <label className="shipments-filter-field">
          <span>From Date</span>
          <input
            type="date"
            name="fromDate"
            value={filters.fromDate}
            aria-label="From Date"
            onChange={handleFilterChange}
          />
        </label>
        <label className="shipments-filter-field">
          <span>To Date</span>
          <input
            type="date"
            name="toDate"
            value={filters.toDate}
            aria-label="To Date"
            onChange={handleFilterChange}
          />
        </label>
        <label className="shipments-filter-field">
          <span>Shipment SAP No</span>
          <input
            type="text"
            name="shipmentSapNo"
            value={filters.shipmentSapNo}
            aria-label="Shipment SAP No"
            placeholder="e.g. 123456"
            onChange={handleFilterChange}
          />
        </label>
        <div className="shipments-filter-actions">
          <button className="shipments-filter-apply" type="submit">
            Apply
          </button>
          {hasActiveFilters ? (
            <button className="shipments-filter-clear" type="button" onClick={handleClearFilters}>
              Clear
            </button>
          ) : null}
        </div>
      </form>
      <div className="shipments-table-shell">
        <div className="shipments-table-wrap">
          <table className="shipments-table">
            <thead>
              <tr>
                <th>Shipment No (SAP)</th>
                <th>Order No (Online)</th>
                <th>Order No (SAP)</th>
                <th>Shipping Carrier</th>
                <th>Tracking No</th>
                <th>Shipment Date</th>
                <th>Total</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {normalizedShipments.map((shipment) => (
                <tr key={shipment.shipmentNoSap}>
                  <td>{shipment.shipmentNoSap}</td>
                  <td>{shipment.orderNoOnline}</td>
                  <td>{shipment.orderNoSap}</td>
                  <td>{shipment.shippingCarrier}</td>
                  <td>{shipment.trackingNo}</td>
                  <td>{shipment.shipmentDate}</td>
                  <td>{shipment.total}</td>
                  <td>
                    <button
                      className="shipment-view-button"
                      type="button"
                      onClick={() => setSelectedShipment(shipment)}
                    >
                      <ViewIcon />
                      View Shipment
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {isLoadingShipments ? (
            <div className="shipments-table-message">Loading shipments...</div>
          ) : null}
          {!isLoadingShipments && !normalizedShipments.length ? (
            <div className="shipments-table-message">No shipments found.</div>
          ) : null}
          {shipmentsError ? (
            <div className="shipments-table-message is-error">{shipmentsError}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ShipmentDetailsPage({ shipment, currency, onBack }) {
  const [apiShipmentDetails, setApiShipmentDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const detail = buildShipmentDetails(shipment, apiShipmentDetails, currency);
  const shouldShowDetails = !isLoadingDetails || Boolean(apiShipmentDetails) || Boolean(detailsError);

  useEffect(() => {
    let isCurrent = true;
    const docNum = Number(shipment.shipmentNoSap);

    async function loadShipmentDetails() {
      if (!Number.isFinite(docNum) || docNum <= 0) {
        return;
      }

      setIsLoadingDetails(true);
      setDetailsError('');
      setApiShipmentDetails(null);

      try {
        const nextShipmentDetails = await fetchDeliveryNoteDetailsByDocNum(docNum);

        if (isCurrent) {
          setApiShipmentDetails(nextShipmentDetails);
        }
      } catch (error) {
        if (isCurrent) {
          if (isSessionExpiredError(error)) {
            setApiShipmentDetails(null);
            setDetailsError('');
            return;
          }

          setApiShipmentDetails(null);
          setDetailsError(error.message || 'Unable to load shipment details.');
        }
      } finally {
        if (isCurrent) {
          setIsLoadingDetails(false);
        }
      }
    }

    loadShipmentDetails();

    return () => {
      isCurrent = false;
    };
  }, [shipment.shipmentNoSap]);

  return (
    <div className="shipment-details-page">
      <header className="shipment-details-hero">
        <div className="shipment-hero-copy">
          <button className="shipment-details-back-link" type="button" onClick={onBack}>
            Back to shipments
          </button>
          <h1>Shipment #{detail.shipmentNoSap}</h1>
          <p>Online order {detail.orderNoOnline} - SAP order {detail.orderNoSap}</p>
        </div>
        <div className="shipment-hero-meta">
          <span>Shipment Date: {detail.shipmentDate}</span>
          <strong>{detail.total}</strong>
        </div>
      </header>

      {isLoadingDetails ? (
        <div className="shipment-detail-message">Loading shipment details...</div>
      ) : null}
      {detailsError ? (
        <div className="shipment-detail-message is-error">{detailsError}</div>
      ) : null}

      {shouldShowDetails ? (
        <>
          <section className="shipment-kpi-grid">
            <div>
              <span>Carrier</span>
              <strong>{detail.shippingCarrier}</strong>
            </div>
            <div>
              <span>Tracking No</span>
              <strong>{detail.trackingNo}</strong>
            </div>
            <div>
              <span>Customer</span>
              <strong>{detail.customerName}</strong>
            </div>
            <div>
              <span>Delivery Date</span>
              <strong>{detail.deliveryDate}</strong>
            </div>
          </section>

          <section className="shipment-details-layout">
            <article className="shipment-detail-card">
              <div className="shipment-section-heading">
                <h2>Items</h2>
                <span>{detail.items.length} products</span>
              </div>
              <div className="shipment-items-table-wrap">
                <table className="shipment-items-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Sku</th>
                      <th>Price</th>
                      <th>Qty</th>
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
                        <td>{item.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <aside className="shipment-total-summary">
              <h2>Totals</h2>
              <div>
                <span>Subtotal</span>
                <strong>{detail.subtotal}</strong>
              </div>
              <div>
                <span>Total Tax Amount</span>
                <strong>{detail.tax}</strong>
              </div>
              <div className="shipment-grand-total">
                <span>Grand Total</span>
                <strong>{detail.total}</strong>
              </div>
            </aside>
          </section>

          <section className="shipment-info-panel">
            <div className="shipment-section-heading">
              <h2>Shipment Information</h2>
              <span>Delivery details</span>
            </div>
            <div className="shipment-info-grid">
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

function buildShipmentDetails(shipment, apiShipmentDetails, currency) {
  if (!apiShipmentDetails) {
    return buildStaticShipmentDetails(shipment, currency);
  }

  const detailCurrency = apiShipmentDetails.DocCurrency || currency;
  const docTotal = getNumber(apiShipmentDetails.DocTotal);
  const taxTotal = getNumber(apiShipmentDetails.VatSum);
  const subtotal = Math.max(docTotal - taxTotal, 0);
  const addressExtension = apiShipmentDetails.AddressExtension || {};
  const documentLines = Array.isArray(apiShipmentDetails.DocumentLines)
    ? apiShipmentDetails.DocumentLines
    : [];
  const fallbackDetails = buildStaticShipmentDetails(shipment, detailCurrency);

  return {
    shipmentNoSap: apiShipmentDetails.DocNum || shipment.shipmentNoSap,
    orderNoOnline: apiShipmentDetails.NumAtCard || shipment.orderNoOnline || '-',
    orderNoSap: shipment.orderNoSap || '-',
    shippingCarrier: formatCarrierName(apiShipmentDetails.TransportationCode),
    trackingNo: apiShipmentDetails.U_TRACKNO || shipment.trackingNo || '-',
    customerName: apiShipmentDetails.CardName || '-',
    shipmentDate: formatCompactDate(apiShipmentDetails.DocDate),
    deliveryDate: formatCompactDate(apiShipmentDetails.DocDueDate || apiShipmentDetails.DocDate),
    subtotal: formatCurrency(subtotal, detailCurrency),
    tax: formatCurrency(taxTotal, detailCurrency),
    total: formatCurrency(docTotal, detailCurrency),
    infoCards: [
      {
        title: 'Shipping Address',
        lines: buildAddressLines(
          addressExtension.ShipToStreet,
          addressExtension.ShipToCity,
          addressExtension.ShipToZipCode,
          addressExtension.ShipToCountry,
          apiShipmentDetails.Address2,
        ),
      },
      {
        title: 'Billing Address',
        lines: buildAddressLines(
          addressExtension.BillToStreet,
          addressExtension.BillToCity,
          addressExtension.BillToZipCode,
          addressExtension.BillToCountry,
          apiShipmentDetails.Address,
        ),
      },
      {
        title: 'Shipping Method',
        lines: [formatCarrierName(apiShipmentDetails.TransportationCode)],
      },
      {
        title: 'Payment Method',
        lines: ['Invoice'],
      },
    ],
    items: documentLines.length
      ? documentLines.map((line, index) => normalizeShipmentLine(line, index, detailCurrency, apiShipmentDetails.DocDueDate || apiShipmentDetails.DocDate))
      : fallbackDetails.items,
  };
}

function buildStaticShipmentDetails(shipment, currency) {
  const subtotalValue = getNumber(String(shipment.total).replace(/[^0-9.-]/g, '')) || 282.97;

  return {
    ...shipment,
    shippingCarrier: formatCarrierName(shipment.shippingCarrier),
    customerName: '-',
    deliveryDate: shipment.shipmentDate,
    subtotal: formatCurrency(subtotalValue, currency),
    tax: formatCurrency(0, currency),
    total: typeof shipment.total === 'string' ? shipment.total : formatCurrency(subtotalValue, currency),
    infoCards: [
      {
        title: 'Shipping Address',
        lines: ['-'],
      },
      {
        title: 'Billing Address',
        lines: ['-'],
      },
      {
        title: 'Shipping Method',
        lines: [formatCarrierName(shipment.shippingCarrier)],
      },
      {
        title: 'Payment Method',
        lines: ['Invoice'],
      },
    ],
    items: [
      {
        lineNum: 0,
        itemCode: 'Shipment item',
        sku: '-',
        description: 'Shipment details will appear here when available.',
        price: formatCurrency(subtotalValue, currency),
        quantity: 1,
        total: typeof shipment.total === 'string' ? shipment.total : formatCurrency(subtotalValue, currency),
      },
    ],
  };
}

function normalizeShipmentLine(line, index, currency, fallbackDeliveryDate) {
  const lineTotal = getNumber(line.LineTotal);

  return {
    lineNum: line.LineNum ?? index,
    itemCode: line.ItemCode || `Line ${index + 1}`,
    sku: line.ItemCode || '-',
    description: line.ItemDescription || line.ItemCode || '-',
    price: formatCurrency(getNumber(line.UnitPrice ?? line.Price), currency),
    quantity: getNumber(line.Quantity),
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

function normalizeShipment(shipment, currency) {
  return {
    shipmentNoSap: shipment.shipmentNoSap || shipment.shipment_no_sap || '-',
    orderNoOnline: shipment.orderNoOnline || shipment.order_no_online || '-',
    orderNoSap: shipment.orderNoSap || shipment.order_no_sap || '-',
    shippingCarrier: formatCarrierName(shipment.shippingCarrier || shipment.shipping_carrier),
    trackingNo: shipment.trackingNo || shipment.tracking_no || '-',
    shipmentDate: formatCompactDate(shipment.shipmentDate || shipment.shipment_date),
    total: typeof shipment.total === 'number' ? formatCurrency(shipment.total, currency) : (shipment.total || '-'),
  };
}

function formatCarrierName(value) {
  if (!value && value !== 0) {
    return '-';
  }

  if (String(value) === '1') {
    return 'UPS Standard';
  }

  return String(value);
}

function getNumber(value) {
  const number = Number.parseFloat(value);
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
