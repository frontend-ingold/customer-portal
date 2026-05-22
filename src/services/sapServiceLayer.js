const SAP_LOGIN_PAYLOAD = {
  CompanyDB: 'BIANCOEVENTO_PRACA',
  Password: '1234',
  UserName: 'B1i',
};

const OPEN_ORDERS_PATH =
  '/B1iXcellerator/exec/ipo/.DEV.IGS.GET_ALLSO_DETAIL.IGS.GET_ALLSO/com.sap.b1i.dev.scenarios.setup/IGS.GET_ALLSO_DETAIL/IGS.GET_ALLSO.ipo/GETALLSODETAIL.xxx.SalesOrder_HdrData';
const TOP_PRODUCTS_PATH =
  '/B1iXcellerator/exec/ipo/.DEV.IGS.GET_ALLSO_DETAIL.IGS.GET_ALLSO/com.sap.b1i.dev.scenarios.setup/IGS.GET_ALLSO_DETAIL/IGS.GET_ALLSO.ipo/GETALLSODETAIL.xxx.TOP10_PRODUCT';
const SESSION_EXPIRED_EVENT = 'customer-portal:session-expired';
const INVALID_SESSION_MESSAGE = 'Invalid session or session already timeout.';
const SESSION_EXPIRED_ERROR_NAME = 'SessionExpiredError';

export async function fetchBusinessPartnerByCardCode(cardCode) {
  const normalizedCardCode = cardCode.trim();

  if (!normalizedCardCode) {
    throw new Error('Enter a card code.');
  }

  const loginResponse = await fetch('/b1s/v1/Login', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(SAP_LOGIN_PAYLOAD),
  });

  if (!loginResponse.ok) {
    throw new Error('Unable to connect to SAP Business One.');
  }

  const select = [
    'CardCode',
    'CardName',
    'CardForeignName',
    'Phone1',
    'ContactPerson',
    'ContactEmployees',
    'EmailAddress',
    'FederalTaxID',
    'CardType',
    'Currency',
    'CreditLimit',
    'OpenOrdersBalance',
    'CurrentAccountBalance',
    'BPAddresses',
  ].join(',');
  const filter = encodeURIComponent(`CardCode eq '${normalizedCardCode}'`);
  const partnerResponse = await fetch(
    `/b1s/v1/BusinessPartners?$select=${select}&$filter=${filter}`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    },
  );

  if (!partnerResponse.ok) {
    throw new Error('Unable to load customer details.');
  }

  const partnerData = await partnerResponse.json();
  const businessPartner = partnerData.value?.[0];

  if (!businessPartner) {
    throw new Error('Card code was not found.');
  }

  return businessPartner;
}

export async function fetchCompanyDetailsByCardCode(cardCode) {
  const normalizedCardCode = cardCode.trim();

  if (!normalizedCardCode) {
    throw new Error('Enter a card code.');
  }

  const response = await fetch(`/rest/V1/getCompanyDetails?cardcode=${encodeURIComponent(normalizedCardCode)}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Unable to load company details.');
  }

  const payload = await response.json();
  return Array.isArray(payload) ? (payload[0] ?? {}) : (payload ?? {});
}

export async function fetchOpenOrdersCountByCardCode(cardCode) {
  const normalizedCardCode = cardCode.trim();

  if (!normalizedCardCode) {
    throw new Error('Enter a card code.');
  }

  const searchParams = new URLSearchParams({
    CardCode: normalizedCardCode,
    OrderStatus: 'Open',
    Skip: '0',
    Top: '99999',
  });
  const orderResponse = await fetch(`/b1i${OPEN_ORDERS_PATH}?${searchParams.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!orderResponse.ok) {
    throw new Error('Unable to load open orders.');
  }

  const orderData = await orderResponse.json();
  return Array.isArray(orderData.SalesOrder_HeaderData)
    ? orderData.SalesOrder_HeaderData.length
    : 0;
}

export async function fetchRecentOrdersByCardCode(cardCode) {
  const normalizedCardCode = cardCode.trim();

  if (!normalizedCardCode) {
    throw new Error('Enter a card code.');
  }

  const select = [
    'CardCode',
    'CardName',
    'DocNum',
    'DocEntry',
    'DocDueDate',
    'NumAtCard',
    'DocCurrency',
    'DiscountPercent',
    'TotalDiscount',
    'VatSum',
    'DocTotal',
    'Comments',
    'PaymentGroupCode',
    'DocumentStatus',
    'DocDate',
  ].join(',');
  const filter = encodeURIComponent(`CardCode eq '${normalizedCardCode}'`);
  const response = await fetch(
    `/b1s/v1/Orders?$select=${select}&$filter=${filter}&$orderby=DocEntry desc&$top=5`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new Error('Unable to load recent orders.');
  }

  const payload = await response.json();

  return Array.isArray(payload.value)
    ? payload.value.map((order) => ({
      cardCode: order.CardCode,
      cardName: order.CardName,
      docNum: order.DocNum,
      docEntry: order.DocEntry,
      docDate: order.DocDate,
      docDueDate: order.DocDueDate,
      currency: order.DocCurrency,
      total: Number.parseFloat(order.DocTotal) || 0,
      status: order.DocumentStatus,
      reference: order.NumAtCard,
      comments: order.Comments,
      paymentGroupCode: order.PaymentGroupCode,
      discountPercent: Number.parseFloat(order.DiscountPercent) || 0,
      totalDiscount: Number.parseFloat(order.TotalDiscount) || 0,
      vatSum: Number.parseFloat(order.VatSum) || 0,
    }))
    : [];
}

export async function fetchOrdersByCardCode(cardCode, options = {}) {
  const normalizedCardCode = cardCode.trim();

  if (!normalizedCardCode) {
    throw new Error('Enter a card code.');
  }

  const top = Number(options.top ?? 20);
  const skip = Number(options.skip ?? 0);
  const select = [
    'CardCode',
    'CardName',
    'DocNum',
    'DocEntry',
    'DocDate',
    'DocDueDate',
    'NumAtCard',
    'DocCurrency',
    'DiscountPercent',
    'TotalDiscount',
    'VatSum',
    'DocTotal',
    'Comments',
    'PaymentGroupCode',
    'DocumentStatus',
  ].join(',');
  const filters = [`CardCode eq '${escapeODataValue(normalizedCardCode)}'`];

  if (options.sapOrderId) {
    filters.push(`DocNum eq ${Number(options.sapOrderId) || 0}`);
  }

  if (options.fromDate) {
    filters.push(`DocDate ge '${options.fromDate}'`);
  }

  if (options.toDate) {
    filters.push(`DocDate le '${options.toDate}'`);
  }

  if (options.status && options.status !== 'All') {
    filters.push(`DocumentStatus eq '${options.status === 'Delivered' ? 'bost_Close' : 'bost_Open'}'`);
  }

  const query = new URLSearchParams({
    $select: select,
    $filter: filters.join(' and '),
    $orderby: 'DocEntry desc',
    $top: String(top),
    $skip: String(skip),
  });

  const requestUrl = `/b1s/v1/Orders?${query.toString()}`;
  let response = await fetchServiceLayerRequest(requestUrl);

  if (response.status === 401 || response.status === 403) {
    await loginToSapServiceLayer();
    response = await fetchServiceLayerRequest(requestUrl);
  }

  if (!response.ok) {
    await throwIfSessionExpiredResponse(response);
    throw new Error('Unable to load orders.');
  }

  const payload = await response.json();
  throwIfSessionExpiredPayload(payload);

  return Array.isArray(payload.value)
    ? payload.value.map((order) => ({
      cardCode: order.CardCode,
      cardName: order.CardName,
      docNum: order.DocNum,
      docEntry: order.DocEntry,
      docDate: order.DocDate,
      docDueDate: order.DocDueDate,
      currency: order.DocCurrency,
      total: Number.parseFloat(order.DocTotal) || 0,
      status: order.DocumentStatus,
      reference: order.NumAtCard,
      comments: order.Comments,
      paymentGroupCode: order.PaymentGroupCode,
      discountPercent: Number.parseFloat(order.DiscountPercent) || 0,
      totalDiscount: Number.parseFloat(order.TotalDiscount) || 0,
      vatSum: Number.parseFloat(order.VatSum) || 0,
    }))
    : [];
}

export async function fetchOrderDetailsByDocNum(docNum) {
  const normalizedDocNum = Number(docNum);

  if (!Number.isFinite(normalizedDocNum) || normalizedDocNum <= 0) {
    throw new Error('Order number is missing.');
  }

  const select = [
    'DocEntry',
    'DocNum',
    'CardCode',
    'CardName',
    'DocDate',
    'DocDueDate',
    'NumAtCard',
    'DocCurrency',
    'DocTotal',
    'VatSum',
    'DocumentStatus',
    'TransportationCode',
    'PaymentGroupCode',
    'Address',
    'Address2',
    'DocumentLines',
    'AddressExtension',
  ].join(',');
  const query = new URLSearchParams({
    $select: select,
    $filter: `DocNum eq ${normalizedDocNum}`,
  });
  const requestUrl = `/b1s/v1/Orders?${query.toString()}`;
  let response = await fetchServiceLayerRequest(requestUrl);

  if (response.status === 401 || response.status === 403) {
    await loginToSapServiceLayer();
    response = await fetchServiceLayerRequest(requestUrl);
  }

  if (!response.ok) {
    await throwIfSessionExpiredResponse(response);
    throw new Error('Unable to load order details.');
  }

  const payload = await response.json();
  throwIfSessionExpiredPayload(payload);

  const order = Array.isArray(payload.value) ? payload.value[0] : null;

  if (!order) {
    throw new Error('Order details were not found.');
  }

  return order;
}

export async function fetchDeliveryNotesByCardCode(cardCode, options = {}) {
  const normalizedCardCode = cardCode.trim();

  if (!normalizedCardCode) {
    throw new Error('Enter a card code.');
  }

  const select = [
    'DocEntry',
    'DocNum',
    'CardCode',
    'CardName',
    'TransportationCode',
    'DocDate',
    'NumAtCard',
    'DocTotal',
    'Comments',
    'U_TRACKNO',
  ].join(',');
  const filters = [`CardCode eq '${escapeODataValue(normalizedCardCode)}'`];

  if (options.shipmentSapNo) {
    filters.push(`DocNum eq ${Number(options.shipmentSapNo) || 0}`);
  }

  if (options.fromDate) {
    filters.push(`DocDate ge '${options.fromDate}'`);
  }

  if (options.toDate) {
    filters.push(`DocDate le '${options.toDate}'`);
  }

  const query = new URLSearchParams({
    $select: select,
    $filter: filters.join(' and '),
    $orderby: 'DocEntry desc',
  });
  const requestUrl = `/b1s/v1/DeliveryNotes?${query.toString()}`;
  let response = await fetchServiceLayerRequest(requestUrl);

  if (response.status === 401 || response.status === 403) {
    await loginToSapServiceLayer();
    response = await fetchServiceLayerRequest(requestUrl);
  }

  if (!response.ok) {
    await throwIfSessionExpiredResponse(response);
    throw new Error('Unable to load shipments.');
  }

  const payload = await response.json();
  throwIfSessionExpiredPayload(payload);

  return Array.isArray(payload.value)
    ? payload.value.map((deliveryNote) => ({
      shipmentNoSap: deliveryNote.DocNum,
      shipmentDocEntry: deliveryNote.DocEntry,
      cardCode: deliveryNote.CardCode,
      cardName: deliveryNote.CardName,
      orderNoOnline: deliveryNote.NumAtCard,
      orderNoSap: '-',
      shippingCarrier: deliveryNote.TransportationCode,
      trackingNo: deliveryNote.U_TRACKNO,
      shipmentDate: deliveryNote.DocDate,
      total: Number.parseFloat(deliveryNote.DocTotal) || 0,
      comments: deliveryNote.Comments,
    }))
    : [];
}

export async function fetchDeliveryNoteDetailsByDocNum(docNum) {
  const normalizedDocNum = Number(docNum);

  if (!Number.isFinite(normalizedDocNum) || normalizedDocNum <= 0) {
    throw new Error('Shipment number is missing.');
  }

  const select = [
    'DocEntry',
    'DocNum',
    'CardCode',
    'CardName',
    'TransportationCode',
    'DocDate',
    'DocDueDate',
    'NumAtCard',
    'DocCurrency',
    'DocTotal',
    'VatSum',
    'Comments',
    'U_TRACKNO',
    'Address',
    'Address2',
    'DocumentLines',
    'AddressExtension',
  ].join(',');
  const query = new URLSearchParams({
    $select: select,
    $filter: `DocNum eq ${normalizedDocNum}`,
  });
  const requestUrl = `/b1s/v1/DeliveryNotes?${query.toString()}`;
  let response = await fetchServiceLayerRequest(requestUrl);

  if (response.status === 401 || response.status === 403) {
    await loginToSapServiceLayer();
    response = await fetchServiceLayerRequest(requestUrl);
  }

  if (!response.ok) {
    await throwIfSessionExpiredResponse(response);
    throw new Error('Unable to load shipment details.');
  }

  const payload = await response.json();
  throwIfSessionExpiredPayload(payload);

  const deliveryNote = Array.isArray(payload.value) ? payload.value[0] : null;

  if (!deliveryNote) {
    throw new Error('Shipment details were not found.');
  }

  return deliveryNote;
}

export async function fetchInvoicesByCardCode(cardCode, options = {}) {
  const normalizedCardCode = cardCode.trim();

  if (!normalizedCardCode) {
    throw new Error('Enter a card code.');
  }

  const select = [
    'DocEntry',
    'DocNum',
    'CardCode',
    'CardName',
    'DocDate',
    'DocDueDate',
    'NumAtCard',
    'DocCurrency',
    'DocTotal',
    'PaidToDate',
    'DocumentStatus',
  ].join(',');
  const filters = [`CardCode eq '${escapeODataValue(normalizedCardCode)}'`];

  if (options.invoiceId) {
    filters.push(`DocNum eq ${Number(options.invoiceId) || 0}`);
  }

  if (options.orderId) {
    filters.push(`contains(NumAtCard,'${escapeODataValue(options.orderId.trim())}')`);
  }

  if (options.fromDate) {
    filters.push(`DocDate ge '${options.fromDate}'`);
  }

  if (options.toDate) {
    filters.push(`DocDate le '${options.toDate}'`);
  }

  if (options.status && options.status !== 'All') {
    filters.push(`DocumentStatus eq '${options.status === 'Paid' ? 'bost_Close' : 'bost_Open'}'`);
  }

  const query = new URLSearchParams({
    $select: select,
    $filter: filters.join(' and '),
    $orderby: 'DocEntry desc',
  });
  const requestUrl = `/b1s/v1/Invoices?${query.toString()}`;
  let response = await fetchServiceLayerRequest(requestUrl);

  if (response.status === 401 || response.status === 403) {
    await loginToSapServiceLayer();
    response = await fetchServiceLayerRequest(requestUrl);
  }

  if (!response.ok) {
    await throwIfSessionExpiredResponse(response);
    throw new Error('Unable to load invoices.');
  }

  const payload = await response.json();
  throwIfSessionExpiredPayload(payload);

  return Array.isArray(payload.value)
    ? payload.value.map((invoice) => {
      const docTotal = Number.parseFloat(invoice.DocTotal) || 0;
      const paidToDate = Number.parseFloat(invoice.PaidToDate) || 0;

      return {
        invoiceId: invoice.DocNum,
        docEntry: invoice.DocEntry,
        cardCode: invoice.CardCode,
        cardName: invoice.CardName,
        orderIdOnline: invoice.NumAtCard,
        date: invoice.DocDate,
        dueDate: invoice.DocDueDate,
        currency: invoice.DocCurrency,
        invoiceAmount: docTotal,
        paidAmount: paidToDate,
        dueAmount: Math.max(docTotal - paidToDate, 0),
        status: docTotal - paidToDate <= 0 ? 'Paid' : normalizeInvoiceDocumentStatus(invoice.DocumentStatus),
      };
    })
    : [];
}

export async function fetchInvoiceDetailsByDocNum(docNum) {
  const normalizedDocNum = Number(docNum);

  if (!Number.isFinite(normalizedDocNum) || normalizedDocNum <= 0) {
    throw new Error('Invoice number is missing.');
  }

  const select = [
    'DocEntry',
    'DocNum',
    'CardCode',
    'CardName',
    'DocDate',
    'DocDueDate',
    'NumAtCard',
    'DocCurrency',
    'DocTotal',
    'PaidToDate',
    'VatSum',
    'DocumentStatus',
    'PaymentGroupCode',
    'Address',
    'Address2',
    'DocumentLines',
    'AddressExtension',
  ].join(',');
  const query = new URLSearchParams({
    $select: select,
    $filter: `DocNum eq ${normalizedDocNum}`,
  });
  const requestUrl = `/b1s/v1/Invoices?${query.toString()}`;
  let response = await fetchServiceLayerRequest(requestUrl);

  if (response.status === 401 || response.status === 403) {
    await loginToSapServiceLayer();
    response = await fetchServiceLayerRequest(requestUrl);
  }

  if (!response.ok) {
    await throwIfSessionExpiredResponse(response);
    throw new Error('Unable to load invoice details.');
  }

  const payload = await response.json();
  throwIfSessionExpiredPayload(payload);

  const invoice = Array.isArray(payload.value) ? payload.value[0] : null;

  if (!invoice) {
    throw new Error('Invoice details were not found.');
  }

  return invoice;
}

function escapeODataValue(value) {
  return String(value).replaceAll("'", "''");
}

async function loginToSapServiceLayer() {
  const loginResponse = await fetch('/b1s/v1/Login', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(SAP_LOGIN_PAYLOAD),
  });

  if (!loginResponse.ok) {
    throw new Error('Unable to connect to SAP Business One.');
  }
}

function fetchServiceLayerRequest(requestUrl) {
  return fetch(requestUrl, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });
}

async function throwIfSessionExpiredResponse(response) {
  const payload = await parseJsonResponse(response);
  throwIfSessionExpiredPayload(payload);
}

async function parseJsonResponse(response) {
  try {
    return await response.clone().json();
  } catch {
    return null;
  }
}

function throwIfSessionExpiredPayload(payload) {
  if (!isSessionExpiredPayload(payload)) {
    return;
  }

  dispatchSessionExpired();
  const error = new Error(INVALID_SESSION_MESSAGE);
  error.name = SESSION_EXPIRED_ERROR_NAME;
  throw error;
}

export function isSessionExpiredError(error) {
  return error?.name === SESSION_EXPIRED_ERROR_NAME
    || String(error?.message || '').toLowerCase() === INVALID_SESSION_MESSAGE.toLowerCase();
}

function isSessionExpiredPayload(payload) {
  const error = payload?.error;
  const message = error?.message?.value || error?.message || '';

  const normalizedMessage = String(message).toLowerCase();

  return Number(error?.code) === 301
    && (
      normalizedMessage.includes('invalid session')
      || normalizedMessage.includes('session already timeout')
    );
}

function dispatchSessionExpired() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}

function normalizeInvoiceDocumentStatus(status) {
  if (status === 'bost_Close' || status === 'Closed') {
    return 'Paid';
  }

  if (status === 'bost_Open' || status === 'Open') {
    return 'Open';
  }

  return status || 'Open';
}

export async function fetchOpenInvoicesCountByCardCode(cardCode) {
  const normalizedCardCode = cardCode.trim();

  if (!normalizedCardCode) {
    throw new Error('Enter a card code.');
  }

  const select = [
    'CardCode',
    'DocumentStatus',
    'PaidToDate',
    'Cancelled',
    'CardName',
    'DocNum',
    'DocEntry',
    'DocDate',
    'NumAtCard',
    'DocCurrency',
    'DiscountPercent',
    'TotalDiscount',
    'VatSum',
    'DocTotal',
    'Comments',
    'DocDueDate',
  ].join(',');
  const filter = encodeURIComponent(`CardCode eq '${normalizedCardCode}' and DocumentStatus eq 'bost_Open'`);
  const invoiceResponse = await fetch(
    `/b1s/v1/Invoices?$select=${select}&$filter=${filter}&$orderby=DocEntry desc`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    },
  );

  if (!invoiceResponse.ok) {
    throw new Error('Unable to load open invoices.');
  }

  const invoiceData = await invoiceResponse.json();
  return Array.isArray(invoiceData.value) ? invoiceData.value.length : 0;
}

export async function fetchTopOrderedProductsByCardCode(cardCode) {
  const normalizedCardCode = cardCode.trim();

  if (!normalizedCardCode) {
    throw new Error('Enter a card code.');
  }

  const searchParams = new URLSearchParams({
    CardCode: normalizedCardCode,
  });
  const topProductsResponse = await fetch(`/b1i${TOP_PRODUCTS_PATH}?${searchParams.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!topProductsResponse.ok) {
    throw new Error('Unable to load top ordered products.');
  }

  const topProductsData = await topProductsResponse.json();
  return Array.isArray(topProductsData.TOP10PRODUCT)
    ? topProductsData.TOP10PRODUCT.map((item) => ({
      itemCode: item.ItemCode,
      itemName: item.ItemName,
      quantity: Number.parseFloat(item.Quantity) || 0,
      price: getNumericField(item, ['Price', 'LineTotal', 'DocTotal', 'Amount', 'Total']),
    }))
    : [];
}

export async function fetchLastOrderedProductsByCardCode(cardCode) {
  const normalizedCardCode = cardCode.trim();

  if (!normalizedCardCode) {
    throw new Error('Enter a card code.');
  }

  const query = `
    query {
      getAllSalesItemByCardCode(cardCode: ${JSON.stringify(normalizedCardCode)}) {
        ItemCode
        Description
        CardCode
        CardName
        DocNum
        Image
      }
    }
  `;

  const response = await fetch('/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error('Unable to load last ordered products.');
  }

  const payload = await response.json();

  if (payload.errors?.length) {
    throw new Error(payload.errors[0]?.message || 'Unable to load last ordered products.');
  }

  return Array.isArray(payload.data?.getAllSalesItemByCardCode)
    ? payload.data.getAllSalesItemByCardCode.map((item) => ({
      itemCode: item.ItemCode,
      description: item.Description,
      cardCode: item.CardCode,
      cardName: item.CardName,
      docNum: item.DocNum,
      imageUrl: item.Image,
    }))
    : [];
}

function getNumericField(source, fieldNames) {
  for (const fieldName of fieldNames) {
    const value = Number.parseFloat(source[fieldName]);

    if (Number.isFinite(value)) {
      return value;
    }
  }

  return 0;
}
