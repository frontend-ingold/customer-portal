import { useEffect, useState } from 'react';
import { portalData } from './data/portalData';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import { fetchBusinessPartnerByCardCode } from './services/sapServiceLayer';
import './styles/dashboard.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [openMenus, setOpenMenus] = useState({ 'Partner Program': true });
  const [pathname, setPathname] = useState(window.location.pathname);
  const [dashboardData, setDashboardData] = useState(portalData);
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });
  const [loginError, setLoginError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const salesSeries = buildSalesSeries(dashboardData.salesItems);
  const orderedProducts = buildOrderedProducts(dashboardData.salesItems);
  const summaryCards = buildSummaryCards(dashboardData.dashboardSummary);
  const statusDistribution = buildStatusDistribution(salesSeries);

  useEffect(() => {
    function handlePopState() {
      setPathname(window.location.pathname);
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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
      setIsAuthenticated(true);
      window.history.pushState({}, '', '/dashboard');
      setPathname('/dashboard');
      return;
    }

    setLoginError('Invalid email or password.');
  }

  async function handleCardSubmit(cardCode) {
    setIsAuthenticating(true);
    setLoginError('');

    try {
      const businessPartner = await fetchBusinessPartnerByCardCode(cardCode);
      setDashboardData(buildDashboardDataFromBusinessPartner(businessPartner));
      setLoginError('');
      setIsAuthenticated(true);
      window.history.pushState({}, '', '/dashboard');
      setPathname('/dashboard');
    } catch (error) {
      setLoginError(error.message || 'Invalid card code.');
    } finally {
      setIsAuthenticating(false);
    }
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
      salesSeries={salesSeries}
      statusDistribution={statusDistribution}
      recentOrders={dashboardData.recentOrders}
      orderedProducts={orderedProducts}
      credit={dashboardData.credit}
      navigation={dashboardData.navigation}
      openMenus={openMenus}
      setOpenMenus={setOpenMenus}
    />
  );
}

export default App;

function buildSummaryCards(summary) {
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
      value: formatCurrency(summary.open_orders_balance),
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
      value: formatCurrency(summary.open_invoices_balance),
      icon: 'due',
      tint: 'violet',
      accent: 'danger',
    },
  ];
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value ?? 0);
}

function buildDashboardDataFromBusinessPartner(businessPartner) {
  const openOrdersBalance = Number(businessPartner.OpenOrdersBalance ?? 0);
  const currentAccountBalance = Number(businessPartner.CurrentAccountBalance ?? 0);

  return {
    ...portalData,
    dashboardSummary: {
      ...portalData.dashboardSummary,
      open_orders_balance: openOrdersBalance,
      open_invoices_balance: currentAccountBalance,
    },
    company: {
      ...portalData.company,
      name: businessPartner.CardName || portalData.company.name,
      customerId: businessPartner.CardCode || portalData.company.customerId,
    },
    credit: {
      ...portalData.credit,
      limit: formatCurrency(currentAccountBalance),
    },
  };
}

function buildSalesSeries(items) {
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
    values: sortedItems.map((item) => item.value),
  };
}

function buildOrderedProducts(items) {
  return items.map((item, index) => ({
    name: item.item_code,
    sku: item.order_no,
    amount: item.description,
    orderedOn: `Order #${item.order_no}`,
    imageUrl: item.image_url,
    productUrl: item.product_url,
  }));
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
