import { useEffect, useState } from 'react';
import { ViewIcon } from '../components/Icons';
import {
  fetchCreditNoteDetailsByDocNum,
  fetchCreditNotesByCardCode,
  isSessionExpiredError,
} from '../services/sapServiceLayer';

export default function MyCreditNotesPage({ creditNotes = [], cardCode = '', currency = 'USD' }) {
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    creditNoteNo: '',
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [loadedCreditNotes, setLoadedCreditNotes] = useState([]);
  const [isLoadingCreditNotes, setIsLoadingCreditNotes] = useState(false);
  const [creditNotesError, setCreditNotesError] = useState('');
  const [selectedCreditNote, setSelectedCreditNote] = useState(null);
  const sourceCreditNotes = cardCode ? loadedCreditNotes : creditNotes;
  const normalizedCreditNotes = sourceCreditNotes.map((creditNote, index) => (
    normalizeCreditNote(creditNote, index, currency)
  ));
  const filteredCreditNotes = cardCode
    ? normalizedCreditNotes
    : normalizedCreditNotes.filter((creditNote) => (
      doesCreditNoteMatchFilters(creditNote, appliedFilters)
    ));
  const hasActiveFilters = filters.fromDate || filters.toDate || filters.creditNoteNo;

  useEffect(() => {
    let isCurrent = true;

    async function loadCreditNotes() {
      if (!cardCode) {
        return;
      }

      setIsLoadingCreditNotes(true);
      setCreditNotesError('');

      try {
        const nextCreditNotes = await fetchCreditNotesByCardCode(cardCode, appliedFilters);

        if (isCurrent) {
          setLoadedCreditNotes(nextCreditNotes);
        }
      } catch (error) {
        if (isCurrent) {
          if (isSessionExpiredError(error)) {
            setLoadedCreditNotes([]);
            setCreditNotesError('');
            return;
          }

          setLoadedCreditNotes([]);
          setCreditNotesError(error.message || 'Unable to load credit notes.');
        }
      } finally {
        if (isCurrent) {
          setIsLoadingCreditNotes(false);
        }
      }
    }

    loadCreditNotes();

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
      creditNoteNo: '',
    };

    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  }

  if (selectedCreditNote) {
    return (
      <CreditNoteDetailsPage
        key={selectedCreditNote.creditNoteNo}
        creditNote={selectedCreditNote}
        currency={currency}
        onBack={() => setSelectedCreditNote(null)}
      />
    );
  }

  return (
    <div className="my-credit-notes-page">
      <form className="credit-notes-filter-bar" onSubmit={handleApplyFilters}>
        <label className="credit-notes-filter-field">
          <span>From Date</span>
          <input
            type="date"
            name="fromDate"
            value={filters.fromDate}
            aria-label="From Date"
            onChange={handleFilterChange}
          />
        </label>
        <label className="credit-notes-filter-field">
          <span>To Date</span>
          <input
            type="date"
            name="toDate"
            value={filters.toDate}
            aria-label="To Date"
            onChange={handleFilterChange}
          />
        </label>
        <label className="credit-notes-filter-field">
          <span>Credit Note No</span>
          <input
            type="text"
            name="creditNoteNo"
            value={filters.creditNoteNo}
            aria-label="Credit Note No"
            placeholder="e.g. 12345"
            onChange={handleFilterChange}
          />
        </label>
        <div className="credit-notes-filter-actions">
          <button className="credit-notes-filter-apply" type="submit">
            Apply
          </button>
          {hasActiveFilters ? (
            <button className="credit-notes-filter-clear" type="button" onClick={handleClearFilters}>
              Clear
            </button>
          ) : null}
        </div>
      </form>
      <div className="credit-notes-table-shell">
        <div className="credit-notes-table-wrap">
          <table className="credit-notes-table">
            <thead>
              <tr>
                <th>Credit Note No</th>
                <th>Invoice No</th>
                <th>Date</th>
                <th>Total</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCreditNotes.map((creditNote) => (
                <tr key={creditNote.key}>
                  <td>{creditNote.creditNoteNo}</td>
                  <td>{creditNote.invoiceNo}</td>
                  <td>{creditNote.date}</td>
                  <td>{creditNote.total}</td>
                  <td>
                    <button
                      className="credit-note-view-button"
                      type="button"
                      onClick={() => setSelectedCreditNote(creditNote)}
                    >
                      <ViewIcon />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {isLoadingCreditNotes ? (
            <div className="credit-notes-table-message">Loading credit notes...</div>
          ) : null}
          {!isLoadingCreditNotes && !filteredCreditNotes.length ? (
            <div className="credit-notes-table-message">No credit notes found.</div>
          ) : null}
          {creditNotesError ? (
            <div className="credit-notes-table-message is-error">{creditNotesError}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CreditNoteDetailsPage({ creditNote, currency, onBack }) {
  const [apiCreditNoteDetails, setApiCreditNoteDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(() => {
    const docNum = Number(creditNote.creditNoteNo);
    return Number.isFinite(docNum) && docNum > 0;
  });
  const [detailsError, setDetailsError] = useState('');
  const detail = buildCreditNoteDetails(creditNote, apiCreditNoteDetails, currency);
  const shouldShowDetails = !isLoadingDetails || Boolean(apiCreditNoteDetails) || Boolean(detailsError);

  useEffect(() => {
    let isCurrent = true;
    const docNum = Number(creditNote.creditNoteNo);

    async function loadCreditNoteDetails() {
      if (!Number.isFinite(docNum) || docNum <= 0) {
        return;
      }

      setIsLoadingDetails(true);
      setDetailsError('');
      setApiCreditNoteDetails(null);

      try {
        const nextCreditNoteDetails = await fetchCreditNoteDetailsByDocNum(docNum);

        if (isCurrent) {
          setApiCreditNoteDetails(nextCreditNoteDetails);
        }
      } catch (error) {
        if (isCurrent) {
          if (isSessionExpiredError(error)) {
            setApiCreditNoteDetails(null);
            setDetailsError('');
            return;
          }

          setApiCreditNoteDetails(null);
          setDetailsError(error.message || 'Unable to load credit note details.');
        }
      } finally {
        if (isCurrent) {
          setIsLoadingDetails(false);
        }
      }
    }

    loadCreditNoteDetails();

    return () => {
      isCurrent = false;
    };
  }, [creditNote.creditNoteNo]);

  return (
    <div className="credit-note-details-page">
      <header className="credit-note-details-hero">
        <div className="credit-note-hero-copy">
          <button className="credit-note-details-back-link" type="button" onClick={onBack}>
            Back to credit notes
          </button>
          <h1>Credit Note #{detail.creditNoteNo}</h1>
          <p>Invoice {detail.invoiceNo}</p>
        </div>
        <div className="credit-note-hero-meta">
          <span>Date: {detail.date}</span>
          <strong>{detail.total}</strong>
        </div>
      </header>

      {isLoadingDetails ? (
        <div className="credit-note-detail-message">Loading Creditnote details...</div>
      ) : null}
      {detailsError ? (
        <div className="credit-note-detail-message is-error">{detailsError}</div>
      ) : null}

      {shouldShowDetails ? (
        <>
          <section className="credit-note-details-layout">
            <article className="credit-note-detail-card">
              <div className="credit-note-section-heading">
                <h2>Items</h2>
                <span>{detail.items.length} products</span>
              </div>
              <div className="credit-note-items-table-wrap">
                <table className="credit-note-items-table">
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

            <aside className="credit-note-total-summary">
              <h2>Totals</h2>
              <div>
                <span>Subtotal</span>
                <strong>{detail.subtotal}</strong>
              </div>
              <div>
                <span>Total Tax Amount</span>
                <strong>{detail.tax}</strong>
              </div>
              <div className="credit-note-grand-total">
                <span>Grand Total</span>
                <strong>{detail.total}</strong>
              </div>
            </aside>
          </section>

          <section className="credit-note-info-panel">
            <div className="credit-note-info-heading">
              <h2>Order information</h2>
            </div>
            <div className="credit-note-info-grid">
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

function normalizeCreditNote(creditNote, index, currency) {
  const total = getNumber(creditNote.total ?? creditNote.docTotal);

  return {
    key: creditNote.docEntry || creditNote.creditNoteNo || creditNote.docNum || index,
    creditNoteNo: creditNote.creditNoteNo || creditNote.docNum || '-',
    invoiceNo: creditNote.invoiceNo || creditNote.baseInvoiceNo || '-',
    rawDate: getDateInputValue(creditNote.date || creditNote.docDate),
    date: formatCompactDate(creditNote.date || creditNote.docDate),
    rawTotal: total,
    total: typeof creditNote.total === 'string'
      ? creditNote.total
      : formatPlainNumber(total, creditNote.currency || currency),
  };
}

function doesCreditNoteMatchFilters(creditNote, filters) {
  const creditNoteDate = creditNote.rawDate;
  const creditNoteNo = String(creditNote.creditNoteNo ?? '').toLowerCase();

  if (filters.fromDate && creditNoteDate && creditNoteDate < filters.fromDate) {
    return false;
  }

  if (filters.toDate && creditNoteDate && creditNoteDate > filters.toDate) {
    return false;
  }

  if (filters.creditNoteNo && !creditNoteNo.includes(filters.creditNoteNo.trim().toLowerCase())) {
    return false;
  }

  return true;
}

function buildCreditNoteDetails(creditNote, apiCreditNoteDetails, currency) {
  if (!apiCreditNoteDetails) {
    return buildStaticCreditNoteDetails(creditNote, currency);
  }

  const detailCurrency = apiCreditNoteDetails.DocCurrency || currency;
  const docTotal = getNumber(apiCreditNoteDetails.DocTotal);
  const taxTotal = getNumber(apiCreditNoteDetails.VatSum);
  const subtotal = Math.max(docTotal - taxTotal, 0);
  const addressExtension = apiCreditNoteDetails.AddressExtension || {};
  const documentLines = Array.isArray(apiCreditNoteDetails.DocumentLines)
    ? apiCreditNoteDetails.DocumentLines
    : [];
  const fallbackDetails = buildStaticCreditNoteDetails(creditNote, detailCurrency);

  return {
    creditNoteNo: apiCreditNoteDetails.DocNum || creditNote.creditNoteNo,
    invoiceNo: getInvoiceNoFromLines(documentLines) || creditNote.invoiceNo || '-',
    date: formatCompactDate(apiCreditNoteDetails.DocDate),
    subtotal: formatCurrency(subtotal, detailCurrency),
    tax: formatCurrency(taxTotal, detailCurrency),
    total: formatCurrency(docTotal, detailCurrency),
    infoCards: [
      {
        title: 'Delivery address',
        lines: buildAddressLines(
          addressExtension.ShipToStreet,
          addressExtension.ShipToCity,
          addressExtension.ShipToZipCode,
          addressExtension.ShipToCountry,
          apiCreditNoteDetails.Address2,
        ),
      },
      {
        title: 'Billing address',
        lines: buildAddressLines(
          addressExtension.BillToStreet,
          addressExtension.BillToCity,
          addressExtension.BillToZipCode,
          addressExtension.BillToCountry,
          apiCreditNoteDetails.Address,
        ),
      },
    ],
    items: documentLines.length
      ? documentLines.map((line, index) => normalizeCreditNoteLine(line, index, detailCurrency))
      : fallbackDetails.items,
  };
}

function buildStaticCreditNoteDetails(creditNote, currency) {
  const total = creditNote.rawTotal || getNumber(creditNote.total);

  return {
    ...creditNote,
    subtotal: formatCurrency(total, currency),
    tax: formatCurrency(0, currency),
    total: typeof creditNote.total === 'string' ? creditNote.total : formatCurrency(total, currency),
    infoCards: [
      {
        title: 'Delivery address',
        lines: ['-'],
      },
      {
        title: 'Billing address',
        lines: ['-'],
      },
    ],
    items: [
      {
        lineNum: 0,
        itemCode: 'Credit note item',
        sku: '-',
        description: 'Credit note details will appear here when available.',
        price: formatCurrency(total, currency),
        quantity: 1,
        total: typeof creditNote.total === 'string' ? creditNote.total : formatCurrency(total, currency),
      },
    ],
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

function normalizeCreditNoteLine(line, index, currency) {
  return {
    lineNum: line.LineNum ?? index,
    itemCode: line.ItemCode || `Line ${index + 1}`,
    sku: line.ItemCode || '-',
    description: line.ItemDescription || line.ItemCode || '-',
    price: formatCurrency(getNumber(line.UnitPrice ?? line.Price), currency),
    quantity: getNumber(line.Quantity),
    total: formatCurrency(getNumber(line.LineTotal), currency),
  };
}

function getInvoiceNoFromLines(lines) {
  const sourceLine = lines.find((line) => line.BaseRef || line.BaseDocNum || line.BaseEntry);
  return sourceLine?.BaseRef || sourceLine?.BaseDocNum || sourceLine?.BaseEntry || '';
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

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
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

function formatPlainNumber(value, currency = 'USD') {
  const fractionDigits = String(currency).toUpperCase() === 'JPY' ? 0 : 2;

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(value ?? 0);
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
