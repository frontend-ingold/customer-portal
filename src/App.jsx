import { useEffect, useRef, useState } from 'react';
import { portalData } from './data/portalData';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import {
  fetchBusinessPartnerByCardCode,
  fetchCompanyDetailsByCardCode,
  fetchLastOrderedProductsByCardCode,
  fetchOpenInvoicesCountByCardCode,
  fetchOpenOrdersCountByCardCode,
  fetchRecentOrdersByCardCode,
  fetchTopOrderedProductsByCardCode,
  isSessionExpiredError,
} from './services/sapServiceLayer';
import './styles/dashboard.css';

const SESSION_STORAGE_KEY = 'customerPortalSession';
const SESSION_EXPIRED_EVENT = 'customer-portal:session-expired';

function App() {
  const [storedSession, setStoredSession] = useState(() => readStoredSession());
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(storedSession));
  const [openMenus, setOpenMenus] = useState({});
  const [pathname, setPathname] = useState(window.location.pathname);
  const [dashboardData, setDashboardData] = useState(storedSession?.dashboardData ?? portalData);
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });
  const [loginError, setLoginError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const refreshedCardCodeRef = useRef('');
  const isCardLoginSubmittingRef = useRef(false);
  const productQuantitySeries = buildSalesSeries(
    dashboardData.topProducts ?? dashboardData.salesItems,
    'quantity',
    dashboardData.dashboardSummary.currency,
  );
  const productPriceSeries = buildSalesSeries(
    dashboardData.topProducts ?? dashboardData.salesItems,
    'price',
    dashboardData.dashboardSummary.currency,
  );
  const hasProductPriceData = hasTopProductPriceData(dashboardData.topProducts);
  const hasGraphqlProductData = hasLastOrderedProductData(dashboardData.lastOrderedProducts);
  const hasSapRecentOrders = hasRecentOrderData(dashboardData.recentOrders);
  const hasCompanyDetails = hasCompanyDetailsData(dashboardData.company);
  const orderedProducts = buildOrderedProducts(
    dashboardData.lastOrderedProducts ?? dashboardData.salesItems,
  );
  const summaryCards = buildSummaryCards(dashboardData.dashboardSummary);
  const statusDistribution = buildStatusDistribution(productQuantitySeries);
  const sessionCardCode = getStoredCardCode(storedSession);

  useEffect(() => {
    function handlePopState() {
      setPathname(window.location.pathname);
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    function handleSessionExpired() {
      expireSession();
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, []);

  useEffect(() => {
    if (!isAuthenticated && pathname !== '/') {
      window.history.replaceState({}, '', '/');
      setPathname('/');
      return;
    }

    if (isAuthenticated && pathname === '/') {
      window.history.replaceState({}, '', '/dashboard');
      setPathname('/dashboard');
    }
  }, [isAuthenticated, pathname]);

  useEffect(() => {
    if (!isAuthenticated || !sessionCardCode) {
      return undefined;
    }

    const refreshKey = [
      sessionCardCode,
      hasProductPriceData ? 'price-ready' : 'needs-price',
      hasGraphqlProductData ? 'last-ready' : 'needs-last',
      hasSapRecentOrders ? 'orders-ready' : 'needs-orders',
      hasCompanyDetails ? 'company-ready' : 'needs-company',
    ].join(':');

    if (refreshedCardCodeRef.current === refreshKey) {
      return undefined;
    }

    refreshedCardCodeRef.current = refreshKey;
    let isCurrent = true;

    async function refreshBusinessPartner() {
      try {
        const businessPartner = await fetchBusinessPartnerByCardCode(sessionCardCode);
        const [
          openOrdersCount,
          openInvoicesCount,
          topProducts,
          lastOrderedProducts,
          recentOrders,
          companyDetails,
        ] = await Promise.all([
          fetchOpenOrdersCountByCardCode(sessionCardCode),
          fetchOpenInvoicesCountByCardCode(sessionCardCode),
          fetchTopOrderedProductsByCardCode(sessionCardCode),
          fetchLastOrderedProductsByCardCode(sessionCardCode),
          fetchRecentOrdersByCardCode(sessionCardCode),
          fetchCompanyDetailsByCardCode(sessionCardCode),
        ]);

        const nextDashboardData = buildDashboardDataFromBusinessPartner(
          businessPartner,
          openOrdersCount,
          openInvoicesCount,
          topProducts,
          lastOrderedProducts,
          recentOrders,
          companyDetails,
        );

        if (!isCurrent) {
          return;
        }

        setDashboardData(nextDashboardData);
        setStoredSession(persistSession(nextDashboardData, sessionCardCode));
        refreshedCardCodeRef.current = [
          sessionCardCode,
          hasTopProductPriceData(topProducts) ? 'price-ready' : 'needs-price',
          hasLastOrderedProductData(lastOrderedProducts) ? 'last-ready' : 'needs-last',
          hasRecentOrderData(recentOrders) ? 'orders-ready' : 'needs-orders',
          hasCompanyDetailsData(nextDashboardData.company) ? 'company-ready' : 'needs-company',
        ].join(':');
      } catch (error) {
        if (isSessionExpiredError(error)) {
          return;
        }

        console.error('BusinessPartner refresh failed:', error);
      }
    }

    refreshBusinessPartner();

    return () => {
      isCurrent = false;
    };
  }, [hasCompanyDetails, hasGraphqlProductData, hasProductPriceData, hasSapRecentOrders, isAuthenticated, sessionCardCode]);

  function handleChange(event) {
    const { name, value } = event.target;
    setCredentials((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const email = credentials.email.trim().toLowerCase();
    const password = credentials.password.trim();

    if (email === 'sales@sohostore.com' && password === 'portal123') {
      setLoginError('');
      setStoredSession(persistSession(portalData));
      setIsAuthenticated(true);
      window.history.pushState({}, '', '/dashboard');
      setPathname('/dashboard');
      return;
    }

    setLoginError('Invalid email or password.');
  }

  async function handleCardSubmit(cardCode) {
    if (isCardLoginSubmittingRef.current) {
      return;
    }

    isCardLoginSubmittingRef.current = true;
    setIsAuthenticating(true);
    setLoginError('');

    try {
      const businessPartner = await fetchBusinessPartnerByCardCode(cardCode);
      const [
        openOrdersCount,
        openInvoicesCount,
        topProducts,
        lastOrderedProducts,
        recentOrders,
        companyDetails,
      ] = await Promise.all([
        fetchOpenOrdersCountByCardCode(cardCode),
        fetchOpenInvoicesCountByCardCode(cardCode),
        fetchTopOrderedProductsByCardCode(cardCode),
        fetchLastOrderedProductsByCardCode(cardCode),
        fetchRecentOrdersByCardCode(cardCode),
        fetchCompanyDetailsByCardCode(cardCode),
      ]);
      const nextDashboardData = buildDashboardDataFromBusinessPartner(
        businessPartner,
        openOrdersCount,
        openInvoicesCount,
        topProducts,
        lastOrderedProducts,
        recentOrders,
        companyDetails,
      );
      const normalizedCardCode = businessPartner.CardCode || cardCode.trim();
      refreshedCardCodeRef.current = [
        normalizedCardCode,
        hasTopProductPriceData(topProducts) ? 'price-ready' : 'needs-price',
        hasLastOrderedProductData(lastOrderedProducts) ? 'last-ready' : 'needs-last',
        hasRecentOrderData(recentOrders) ? 'orders-ready' : 'needs-orders',
        hasCompanyDetailsData(nextDashboardData.company) ? 'company-ready' : 'needs-company',
      ].join(':');
      setDashboardData(nextDashboardData);
      setStoredSession(persistSession(nextDashboardData, normalizedCardCode));
      setLoginError('');
      setIsAuthenticated(true);
      window.history.pushState({}, '', '/dashboard');
      setPathname('/dashboard');
    } catch (error) {
      setLoginError(error.message || 'Invalid card code.');
    } finally {
      isCardLoginSubmittingRef.current = false;
      setIsAuthenticating(false);
    }
  }

  function handleLogout() {
    clearSession();
    window.history.pushState({}, '', '/');
    setPathname('/');
  }

  function expireSession() {
    clearSession();
    window.history.replaceState({}, '', '/');
    setPathname('/');
  }

  function clearSession() {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    refreshedCardCodeRef.current = '';
    isCardLoginSubmittingRef.current = false;
    setStoredSession(null);
    setCredentials({
      email: '',
      password: '',
    });
    setDashboardData(portalData);
    setLoginError('');
    setIsAuthenticated(false);
  }

  function handleNavigate(nextPath) {
    window.history.pushState({}, '', nextPath);
    setPathname(nextPath);
  }

  if (!isAuthenticated || pathname === '/') {
    return (
      <LoginPage
        credentials={credentials}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onCardSubmit={handleCardSubmit}
        error={loginError}
        isAuthenticating={isAuthenticating}
      />
    );
  }

  return (
    <DashboardPage
      company={dashboardData.company}
      summaryCards={summaryCards}
      salesSeries={productPriceSeries}
      statusDistribution={statusDistribution}
      recentOrders={dashboardData.recentOrders}
      shipments={dashboardData.shipments}
      invoices={dashboardData.invoices}
      orderedProducts={orderedProducts}
      credit={dashboardData.credit}
      navigation={dashboardData.navigation}
      openMenus={openMenus}
      setOpenMenus={setOpenMenus}
      currentPath={pathname}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
    />
  );
}

export default App;

function readStoredSession() {
  try {
    const session = localStorage.getItem(SESSION_STORAGE_KEY);
    return session ? JSON.parse(session) : null;
  } catch {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

function persistSession(dashboardData, cardCode = '') {
  const session = {
    authMethod: cardCode ? 'card' : 'credentials',
    cardCode,
    dashboardData,
    loggedInAt: new Date().toISOString(),
  };

  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  return session;
}

function getStoredCardCode(session) {
  if (!session) {
    return '';
  }

  if (session.cardCode) {
    return session.cardCode;
  }

  const restoredCustomerId = session.dashboardData?.company?.customerId;

  if (restoredCustomerId && restoredCustomerId !== portalData.company.customerId) {
    return restoredCustomerId;
  }

  return '';
}

function hasTopProductPriceData(items) {
  return Array.isArray(items) && items.some((item) => (
    getSeriesNumber(item.price ?? item.Price) > 0
  ));
}

function hasLastOrderedProductData(items) {
  return Array.isArray(items) && items.length > 0;
}

function hasRecentOrderData(items) {
  return Array.isArray(items) && items.some((item) => item.docEntry || item.DocEntry);
}

function hasCompanyDetailsData(company) {
  return Boolean(
    company?.salesEmployee
      || company?.shippingType
      || company?.contactPersons?.length
      || company?.billingAddress?.length
      || company?.shippingAddress?.length
      || company?.creditLimit,
  );
}

function buildSummaryCards(summary) {
  const currency = summary.currency || 'USD';

  return [
    {
      title: 'Open Orders',
      value: String(summary.count ?? 0),
      icon: 'orders',
      tint: 'rose',
      accent: 'danger',
    },
    {
      title: 'Open Orders Amount',
      value: formatCurrency(summary.open_orders_balance, currency),
      icon: 'shipments',
      tint: 'mint',
      accent: 'success',
    },
    {
      title: 'Open Invoices',
      value: String(summary.open_invoices_count ?? 0),
      icon: 'invoices',
      tint: 'amber',
      accent: 'warning',
    },
    {
      title: 'Open Invoices Amount',
      value: formatCurrency(summary.open_invoices_balance, currency),
      icon: 'due',
      tint: 'violet',
      accent: 'danger',
    },
  ];
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

function buildDashboardDataFromBusinessPartner(
  businessPartner,
  openOrdersCount,
  openInvoicesCount,
  topProducts,
  lastOrderedProducts,
  recentOrders,
  companyDetails,
) {
  const openOrdersBalance = Number(businessPartner.OpenOrdersBalance ?? 0);
  const currentAccountBalance = Number(businessPartner.CurrentAccountBalance ?? 0);
  const openInvoicesAmount = currentAccountBalance;
  const creditLimit = Number(businessPartner.CreditLimit ?? currentAccountBalance);
  const currency = businessPartner.Currency || 'USD';
  const billingAddress = buildCompanyAddressList(
    getCompanyDetailValue(companyDetails, ['billing_address', 'billingAddress', 'BillingAddress']),
    businessPartner.BPAddresses,
    'bo_BillTo',
    businessPartner.Phone1,
  );
  const shippingAddress = buildCompanyAddressList(
    getCompanyDetailValue(companyDetails, ['shipping_address', 'shippingAddress', 'ShippingAddress']),
    businessPartner.BPAddresses,
    'bo_ShipTo',
    businessPartner.Phone1,
  );

  return {
    ...portalData,
    dashboardSummary: {
      ...portalData.dashboardSummary,
      count: openOrdersCount ?? portalData.dashboardSummary.count,
      open_invoices_count: openInvoicesCount ?? portalData.dashboardSummary.open_invoices_count,
      currency,
      open_orders_balance: openOrdersBalance,
      open_invoices_balance: openInvoicesAmount,
    },
    company: {
      ...portalData.company,
      name: [businessPartner.CardName, businessPartner.CardForeignName].filter(Boolean).join(' ') || portalData.company.name,
      customerId: businessPartner.CardCode || portalData.company.customerId,
      email: businessPartner.EmailAddress || portalData.company.email,
      phone: businessPartner.Phone1 || portalData.company.phone,
      currency,
      vat: businessPartner.FederalTaxID || businessPartner.VatRegistrationNumber || '',
      contactPerson: businessPartner.ContactPerson || '',
      currentAccountBalance: formatCurrency(currentAccountBalance, currency),
      salesEmployee: getCompanyDetailValue(companyDetails, ['salesemployee', 'salesEmployee', 'SalesEmployee']) || '-',
      salesEmployeeEmail: getCompanyDetailValue(companyDetails, ['salesemployeeemail', 'salesEmployeeEmail', 'SalesEmployeeEmail']) || '-',
      salesEmployeePhone: getCompanyDetailValue(companyDetails, ['salesemployeephone', 'salesEmployeePhone', 'SalesEmployeePhone']) || '-',
      contactPersons: buildContactPersons(businessPartner.ContactEmployees),
      shippingType: getCompanyDetailValue(companyDetails, ['delivery', 'shippingType', 'ShippingType']) || '-',
      billingAddress,
      shippingAddress,
      address: shippingAddress[0] || billingAddress[0] || portalData.company.address,
      creditLimit: formatCurrency(creditLimit, currency),
    },
    credit: {
      ...portalData.credit,
      limit: formatCurrency(creditLimit, currency),
    },
    recentOrders: buildRecentOrders(recentOrders, currency),
    topProducts,
    lastOrderedProducts,
  };
}

function getCompanyDetailValue(source, fieldNames) {
  if (!source || typeof source !== 'object') {
    return '';
  }

  for (const fieldName of fieldNames) {
    const value = source[fieldName];

    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return '';
}

function buildCompanyAddressList(apiAddresses, sapAddresses, addressType, fallbackPhone) {
  const normalizedApiAddresses = normalizeApiAddressList(apiAddresses);

  if (normalizedApiAddresses.length) {
    return normalizedApiAddresses;
  }

  if (!Array.isArray(sapAddresses)) {
    return [];
  }

  const matchingAddresses = sapAddresses.filter((address) => address.AddressType === addressType);
  const sourceAddress = matchingAddresses[0] || sapAddresses[0];

  if (!sourceAddress) {
    return [];
  }

  return [
    sourceAddress.AddressName,
    [sourceAddress.Street, sourceAddress.Block].filter(Boolean).join(', '),
    [sourceAddress.City, sourceAddress.State, sourceAddress.ZipCode].filter(Boolean).join(', '),
    sourceAddress.Country,
    fallbackPhone ? `T: ${fallbackPhone}` : '',
  ].filter(Boolean);
}

function normalizeApiAddressList(addresses) {
  if (!Array.isArray(addresses) || !addresses.length) {
    return [];
  }

  if (typeof addresses[0] === 'string') {
    return addresses.filter(Boolean);
  }

  const address = addresses[0];

  return [
    address.company,
    address.street,
    [address.city, address.region, address.country, address.postcode].filter(Boolean).join(', '),
    address.telephone ? `T: ${address.telephone}` : '',
  ].filter(Boolean);
}

function buildSalesSeries(items, metric = 'quantity', currency = 'USD') {
  if (items?.length && ('quantity' in items[0] || 'Quantity' in items[0])) {
    return {
      labels: items.map((item) => item.itemCode || item.ItemCode),
      names: items.map((item) => item.itemName || item.ItemName),
      values: items.map((item) => {
        if (metric === 'price') {
          return getSeriesNumber(item.price ?? item.Price);
        }

        return getSeriesNumber(item.quantity ?? item.Quantity);
      }),
      metric,
      currency,
    };
  }

  const groupedItems = items.reduce((groups, item) => {
    const key = item.product_url || item.item_code;
    const current = groups.get(key);

    if (current) {
      current.value += 1;
      return groups;
    }

    groups.set(key, {
      label: item.item_code,
      value: 1,
    });
    return groups;
  }, new Map());

  const sortedItems = [...groupedItems.values()].sort((left, right) => (
    right.value - left.value || left.label.localeCompare(right.label)
  ));

  return {
    labels: sortedItems.map((item) => item.label),
    names: sortedItems.map((item) => item.label),
    values: sortedItems.map((item) => item.value),
    metric,
    currency,
  };
}

function getSeriesNumber(value) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : 0;
}

function buildOrderedProducts(items) {
  return items.map((item, index) => ({
    id: `${item.docNum || item.DocNum || item.order_no || 'product'}-${item.itemCode || item.ItemCode || item.item_code || index}`,
    name: item.itemCode || item.ItemCode || item.item_code,
    sku: item.docNum || item.DocNum || item.order_no,
    amount: item.description || item.Description,
    orderedOn: `Order #${item.docNum || item.DocNum || item.order_no}`,
    imageUrl: item.imageUrl || item.Image || item.image_url,
    productUrl: item.productUrl || item.product_url || '#',
  }));
}

function buildRecentOrders(orders, fallbackCurrency = 'USD') {
  if (!Array.isArray(orders) || !orders.length) {
    return portalData.recentOrders;
  }

  return orders.map((order) => {
    const status = normalizeOrderStatus(order.status ?? order.DocumentStatus);
    const currency = order.currency || order.DocCurrency || fallbackCurrency;
    const total = order.total ?? order.DocTotal ?? 0;
    const docNum = order.docNum ?? order.DocNum;

    return {
      id: docNum ? `#${docNum}` : `#${order.docEntry ?? order.DocEntry}`,
      sapId: docNum ?? order.docEntry ?? order.DocEntry,
      onlineId: order.reference ?? order.NumAtCard ?? '',
      docEntry: order.docEntry ?? order.DocEntry,
      docNum,
      rawDocDate: order.docDate ?? order.DocDate,
      rawDocDueDate: order.docDueDate ?? order.DocDueDate,
      date: formatDate(order.docDate ?? order.DocDate),
      deliveryDate: formatDate(order.docDueDate ?? order.DocDueDate),
      status: status.label,
      statusClass: status.className,
      source: order.source || 'Internet-Shop',
      paymentGroupCode: order.paymentGroupCode ?? order.PaymentGroupCode,
      paymentTerms: order.paymentTerms || formatPaymentTerms(order.paymentGroupCode ?? order.PaymentGroupCode),
      currency,
      total,
      amount: formatCurrency(total, currency),
    };
  });
}

function formatPaymentTerms(value) {
  if (!value && value !== 0) {
    return '30 Days Net';
  }

  const numericValue = Number(value);

  if (numericValue === -1 || Number.isNaN(numericValue)) {
    return String(value);
  }

  return `${numericValue} Days Net`;
}

function normalizeOrderStatus(status) {
  if (status === 'bost_Close' || status === 'Closed') {
    return {
      label: 'Closed',
      className: 'delivered',
    };
  }

  if (status === 'bost_Open' || status === 'Open') {
    return {
      label: 'Open',
      className: 'processing',
    };
  }

  return {
    label: status || 'Open',
    className: 'pending',
  };
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function buildContactPersons(contactEmployees) {
  if (!Array.isArray(contactEmployees)) {
    return [];
  }

  const contacts = new Map();

  contactEmployees.forEach((employee) => {
    const email = (employee.E_Mail || '').trim();

    if (!email) {
      return;
    }

    const name = [employee.FirstName, employee.LastName].filter(Boolean).join(' ') || employee.Name || '-';
    const key = email.toLowerCase() || name.trim().toLowerCase();

    if (!contacts.has(key)) {
      contacts.set(key, {
        name,
        email,
      });
    }
  });

  return [...contacts.values()];
}

function buildStatusDistribution(series) {
  const colors = [
    '#f4cf84',
    '#8bbbf0',
    '#86d0b5',
    '#ae92eb',
    '#fb95a3',
    '#70c1b3',
    '#f08a5d',
    '#6c5ce7',
    '#00b894',
    '#e17055',
  ];
  const total = series.values.reduce((sum, value) => sum + value, 0);

  return series.labels.map((label, index) => ({
    label,
    count: series.values[index] ?? 0,
    percent: total ? Number((((series.values[index] ?? 0) / total) * 100).toFixed(1)) : 0,
    color: colors[index % colors.length],
  }));
}
