import { useEffect, useState } from 'react';
import { ViewIcon } from '../components/Icons';
import { fetchDeliveryNotesByCardCode } from '../services/sapServiceLayer';

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
                    <button className="shipment-view-button" type="button">
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

function normalizeShipment(shipment, currency) {
  return {
    shipmentNoSap: shipment.shipmentNoSap || shipment.shipment_no_sap || '-',
    orderNoOnline: shipment.orderNoOnline || shipment.order_no_online || '-',
    orderNoSap: shipment.orderNoSap || shipment.order_no_sap || '-',
    shippingCarrier: formatCarrier(shipment.shippingCarrier || shipment.shipping_carrier),
    trackingNo: shipment.trackingNo || shipment.tracking_no || '-',
    shipmentDate: formatCompactDate(shipment.shipmentDate || shipment.shipment_date),
    total: typeof shipment.total === 'number' ? formatCurrency(shipment.total, currency) : (shipment.total || '-'),
  };
}

function formatCarrier(value) {
  if (!value && value !== 0) {
    return '-';
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
