import { useState } from 'react';
import {
  BuildingIcon,
  CartIcon,
  ChevronIcon,
  CreditIcon,
  DashboardIcon,
  DocumentIcon,
  DownloadIcon,
  HeadsetIcon,
  InvoiceIcon,
  LogoutIcon,
  PartnerIcon,
  ShipmentIcon,
  UsersIcon,
  ViewIcon,
} from '../components/Icons';
import customerPortalLogo from '../assets/customer-portal-logo.svg';
import CompanyPage from './MyCompanyPage';
import MyInvoicesPage from './MyInvoicesPage';
import MyOrdersPage from './MyOrdersPage';
import MyShipmentsPage from './MyShipmentsPage';

const navIcons = {
  dashboard: DashboardIcon,
  orders: CartIcon,
  shipments: ShipmentIcon,
  invoices: InvoiceIcon,
  credit: CreditIcon,
  company: BuildingIcon,
  users: UsersIcon,
  partner: PartnerIcon,
  support: HeadsetIcon,
  downloads: DownloadIcon,
  logout: LogoutIcon,
};

const statIcons = {
  orders: CartIcon,
  shipments: ShipmentIcon,
  invoices: DocumentIcon,
  due: CreditIcon,
};

export default function DashboardPage({
  company,
  summaryCards,
  salesSeries,
  statusDistribution,
  recentOrders,
  shipments,
  invoices,
  orderedProducts,
  credit,
  navigation,
  openMenus,
  setOpenMenus,
  currentPath,
  onNavigate,
  onLogout,
}) {
  const [activeStatusIndex, setActiveStatusIndex] = useState(null);
  const [activeProductIndex, setActiveProductIndex] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const maxSalesValue = Math.max(...salesSeries.values, 1);
  const valueTicks = buildValueTicks(maxSalesValue);
  const totalStatusCount = statusDistribution.reduce(
    (sum, item) => sum + item.count,
    0,
  );
  const pieSlices = buildPieSlices(statusDistribution);
  const activeStatus =
    activeStatusIndex === null ? null : (pieSlices[activeStatusIndex] ?? null);
  const activeProduct =
    activeProductIndex === null
      ? null
      : {
          label: salesSeries.labels[activeProductIndex],
          name: salesSeries.names?.[activeProductIndex],
          value: salesSeries.values[activeProductIndex],
          xPercent: getQuantityPercent(salesSeries.values[activeProductIndex], maxSalesValue),
          yPercent: getProductRowPercent(activeProductIndex, salesSeries.labels.length),
        };

  return (
    <div className="portal-shell">
      <aside className={`sidebar ${isMobileMenuOpen ? 'is-mobile-open' : ''}`}>
        <div>
          <div className="brand-block">
            <img
              className="brand-logo"
              src={customerPortalLogo}
              alt="Customer Portal"
            />
            <button
              type="button"
              className="mobile-menu-toggle"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((current) => !current)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>

          <nav className="sidebar-nav">
            {navigation.map((item) => {
              const Icon = navIcons[item.icon];
              const hasChildren = Boolean(item.children?.length);
              const isOpen = Boolean(openMenus[item.label]);
              const itemPath = getNavPath(item.label);
              const isActive = itemPath === currentPath;

              if (hasChildren) {
                return (
                  <div key={item.label} className="nav-group">
                    <button
                      type="button"
                      className={`nav-item nav-toggle ${isActive ? 'is-active' : ''}`}
                      onClick={() =>
                        setOpenMenus((current) => ({
                          ...current,
                          [item.label]: !current[item.label],
                        }))
                      }
                    >
                      <span className="nav-main">
                        <Icon />
                        <span>{item.label}</span>
                      </span>
                      <span className={`nav-chevron ${isOpen ? 'is-open' : ''}`}>
                        <ChevronIcon />
                      </span>
                    </button>

                    {isOpen && (
                      <div className="submenu">
                        {item.children.map((child) => (
                          <a
                            key={child.label}
                            className="submenu-item"
                            href="/"
                            onClick={(event) => event.preventDefault()}
                          >
                            {child.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <a
                  key={item.label}
                  className={`nav-item ${isActive ? 'is-active' : ''}`}
                  href="/"
                  onClick={(event) => {
                    event.preventDefault();
                    if (item.label === 'Logout') {
                      onLogout();
                      setIsMobileMenuOpen(false);
                      return;
                    }

                    if (itemPath) {
                      onNavigate(itemPath);
                      setIsMobileMenuOpen(false);
                    }
                  }}
                >
                  <Icon />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="help-card">
            <div className="help-icon">
              <HeadsetIcon />
            </div>
            <h3>Need Help?</h3>
            <p>Our support team is here to help you.</p>
            <button type="button">Contact Us</button>
          </div>

          <div className="copyright">© 2026 Customer Portal. All rights reserved.</div>
        </div>
      </aside>

      <main className="dashboard">
        {currentPath === '/company' ? (
          <CompanyPage company={company} credit={credit} />
        ) : currentPath === '/orders' ? (
          <MyOrdersPage
            orders={recentOrders}
            currency={company.currency}
            cardCode={company.customerId}
          />
        ) : currentPath === '/shipments' ? (
          <MyShipmentsPage
            shipments={shipments}
            cardCode={company.customerId}
            currency={company.currency}
          />
        ) : currentPath === '/invoices' ? (
          <MyInvoicesPage
            invoices={invoices}
            cardCode={company.customerId}
            currency={company.currency}
          />
        ) : (
          <>
        <header className="topbar">
          <div>
            <h1>
              Welcome back, {company.name} <span className="wave-hand">{'\u{1F44B}'}</span>
            </h1>
            <p>Here&apos;s what&apos;s happening with your account today.</p>
          </div>
          <div className="cardcode-badge">
            <span>CardCode</span>
            <strong>{company.customerId}</strong>
          </div>
        </header>

        <section className="stats-grid">
          {summaryCards.map((card) => {
            const Icon = statIcons[card.icon];
            return (
              <article key={card.title} className="panel stat-card">
                <div className={`stat-icon ${card.tint}`}>
                  <Icon />
                </div>
                <div className="stat-copy">
                  <h2>{card.title}</h2>
                  <strong>{card.value}</strong>
                </div>
              </article>
            );
          })}
        </section>

        <section className="analytics-grid">
          <article className="panel chart-panel">
            <div className="panel-heading">
              <h2>Last 10 Ordered Products</h2>
            </div>
            
            <div className="line-chart product-axis-chart">
              <div className="product-y-axis">
                {salesSeries.labels.map((label, index) => (
                  <button
                    type="button"
                    key={`${label}-${index}`}
                    className={index === activeProductIndex ? 'is-active' : ''}
                    onMouseEnter={() => setActiveProductIndex(index)}
                    onFocus={() => setActiveProductIndex(index)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div
                className={`chart-stage horizontal-products-stage ${activeProduct ? 'has-active-product' : ''}`}
                onMouseLeave={() => setActiveProductIndex(null)}
              >
                <div className="quantity-grid" aria-hidden="true">
                  {valueTicks.map((tick) => (
                    <span key={tick} style={{ left: `${getQuantityPercent(tick, maxSalesValue)}%` }} />
                  ))}
                </div>
                <div className="horizontal-bars">
                  {salesSeries.values.map((value, index) => (
                    <button
                      type="button"
                      key={`price-${salesSeries.labels[index]}-${index}`}
                      className={`product-bar-row ${index === activeProductIndex ? 'is-active' : ''}`}
                      onMouseEnter={() => setActiveProductIndex(index)}
                      onFocus={() => setActiveProductIndex(index)}
                    >
                      <span className="product-bar-track">
                        <span
                          className="product-bar-fill"
                          style={{
                            width: `${getQuantityPercent(value, maxSalesValue)}%`,
                            animationDelay: `${160 + (index * 70)}ms`,
                          }}
                        />
                      </span>
                      <span className="product-bar-value">
                        {formatSeriesValue(value, salesSeries)}
                      </span>
                    </button>
                  ))}
                </div>
                {activeProduct ? (
                  <div
                    className="top-products-tooltip"
                    style={{
                      left: `calc(${activeProduct.xPercent}% - ${(activeProduct.xPercent / 100) * 48}px)`,
                      top: `${activeProduct.yPercent}%`,
                    }}
                  >
                    <strong>{activeProduct.label}</strong>
                    {activeProduct.name ? <span>{activeProduct.name}</span> : null}
                    <span>Price: {formatSeriesValue(activeProduct.value, salesSeries)}</span>
                  </div>
                ) : null}
                <div className="chart-x-axis">
                  {valueTicks.map((tick) => (
                    <span key={tick}>{formatSeriesValue(tick, salesSeries)}</span>
                  ))}
                </div>
              </div>
            </div>
          </article>

          <article className="panel donut-panel">
            <div className="panel-heading">
              <h2>Top 10 Ordered Products</h2>
            </div>
            <div className="donut-wrap">
              <div
                className={`pie-chart-shell ${activeStatus ? 'has-active' : ''}`}
                onMouseLeave={() => setActiveStatusIndex(null)}
              >
                <div className="donut-chart">
                  <svg viewBox="0 0 220 220" className="pie-chart-svg" aria-label="Top 10 ordered products quantity distribution">
                    {pieSlices.map((item, index) => (
                      <path
                        key={item.label}
                        d={item.path}
                        fill={item.color}
                        className={index === activeStatusIndex ? 'pie-slice is-active' : 'pie-slice'}
                        onMouseEnter={() => setActiveStatusIndex(index)}
                        onFocus={() => setActiveStatusIndex(index)}
                        tabIndex={0}
                        role="presentation"
                      />
                    ))}
                  </svg>
                </div>
                {activeStatus ? (
                  <div
                    className="pie-tooltip"
                    style={{
                      left: `${activeStatus.tooltipX}%`,
                      top: `${activeStatus.tooltipY}%`,
                    }}
                  >
                    <strong>{activeStatus.label}</strong>
                    <span>
                      <i style={{ background: activeStatus.color }} />
                      {activeStatus.count}
                    </span>
                  </div>
                ) : null}
              
              </div>
              <div
                className={`status-legend ${activeStatus ? 'has-active' : ''}`}
                onMouseLeave={() => setActiveStatusIndex(null)}
              >
                {pieSlices.map((item, index) => (
                  <button
                    type="button"
                    key={item.label}
                    className={`status-item ${index === activeStatusIndex ? 'is-active' : ''}`}
                    onMouseEnter={() => setActiveStatusIndex(index)}
                    onFocus={() => setActiveStatusIndex(index)}
                  >
                    <span className="dot" style={{ background: item.color }} />
                    <span className="status-label">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </article>
        </section>

        <section className="content-grid">
          <article className="panel orders-panel">
            <div className="panel-heading">
              <h2>Recent Orders</h2>
              <a
                href="/orders"
                onClick={(event) => {
                  event.preventDefault();
                  onNavigate('/orders');
                }}
              >
                View all orders
              </a>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.id}</td>
                      <td>{order.date}</td>
                      <td>
                        <span className={`status-pill ${order.statusClass}`}>
                          {order.status}
                        </span>
                      </td>
                      <td>{order.amount}</td>
                      <td>
                        <button className="icon-button" type="button" aria-label="View order">
                          <ViewIcon />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel products-panel">
            <div className="panel-heading">
              <h2>Last Ordered Products</h2>
             
            </div>
            <div className="product-list">
              {orderedProducts.map((product) => (
                <div key={product.id || product.name} className="product-row">
                  <a
                    className="product-thumb-link"
                    href={product.productUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${product.name}`}
                  >
                    <img
                      className={`product-thumb ${product.tone}`}
                      src={product.imageUrl}
                      alt={product.name}
                    />
                  </a>
                  <div className="product-copy">
                    <strong>{product.name}</strong>
                    <span>{product.amount}</span>
                  </div>
                  <div className="product-meta">
                    <strong>#{product.sku}</strong>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="bottom-grid">
          <article className="panel company-panel">
            <div className="panel-heading">
              <h2>Company Details</h2>
            </div>
            <div className="company-body">
              <div className="company-columns">
                <div>
                  <label>Company Name</label>
                  <p>{company.name}</p>
                  <label>Phone</label>
                  <p>{company.phone || '-'}</p>
                  <label>Sales Employee</label>
                  <p>{company.salesEmployee || '-'}</p>
                  <label>Sales Employee Email</label>
                  <p>{company.salesEmployeeEmail || '-'}</p>
                </div>
                <div>
                  <label>Sales Employee Phone</label>
                  <p>{company.salesEmployeePhone || '-'}</p>
                  <label>Contact Persons</label>
                  <div className="company-contact-list">
                    {company.contactPersons?.length ? (
                      company.contactPersons.map((contact) => (
                        <p key={`${contact.name}-${contact.email}`}>
                          <span>{contact.name}</span>
                          <span>{contact.email}</span>
                        </p>
                      ))
                    ) : (
                      <p>-</p>
                    )}
                  </div>
                  <label>Shipping Type</label>
                  <p className="shipping-type">
                    <span>{company.shippingType || '-'}</span>
                  </p>
                </div>
              </div>
            </div>
          </article>

          <article className="panel credit-panel">
            <div className="panel-heading">
              <h2>Credit Limit</h2>
            </div>
            <div className="credit-simple">
              <span>Total:</span>
              <strong>{credit.limit}</strong>
            </div>
          </article>
        </section>
          </>
        )}
      </main>
    </div>
  );
}

function getNavPath(label) {
  if (label === 'Dashboard') {
    return '/dashboard';
  }

  if (label === 'My Company') {
    return '/company';
  }

  if (label === 'My Orders') {
    return '/orders';
  }

  if (label === 'My Shipments') {
    return '/shipments';
  }

  if (label === 'My Invoices') {
    return '/invoices';
  }

  return '';
}

function buildValueTicks(maxValue) {
  const step = Math.max(1, Math.ceil(maxValue / 5));
  const ticks = [];

  for (let tick = 0; tick <= step * 5; tick += step) {
    ticks.push(tick);
  }

  return ticks;
}

function formatSeriesValue(value, series) {
  if (series.metric !== 'price') {
    return value;
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: series.currency || 'USD',
      maximumFractionDigits: 0,
    }).format(value ?? 0);
  } catch {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value ?? 0);
  }
}

function getQuantityPercent(value, maxValue) {
  return maxValue ? Math.min(100, (value / maxValue) * 100) : 0;
}

function getProductRowPercent(index, total) {
  if (total <= 1) {
    return 50;
  }

  const rowHeight = 18;
  const rowGap = 8;
  const topPadding = 8;
  const bottomPadding = 30;
  const chartHeight = topPadding + (total * rowHeight) + ((total - 1) * rowGap) + bottomPadding;
  const rowCenter = topPadding + (index * (rowHeight + rowGap)) + (rowHeight / 2);

  return (rowCenter / chartHeight) * 100;
}

function buildPieSlices(items) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  let currentAngle = -Math.PI / 2;

  return items.map((item) => {
    const sliceAngle = total ? (item.count / total) * Math.PI * 2 : 0;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;

    const midAngle = startAngle + sliceAngle / 2;
    const tooltipRadius = 58;
    const tooltipX = 50 + ((Math.cos(midAngle) * tooltipRadius) / 220) * 100;
    const tooltipY = 50 + ((Math.sin(midAngle) * tooltipRadius) / 220) * 100;

    return {
      ...item,
      path: describePieSlice(110, 110, 100, startAngle, endAngle),
      tooltipX,
      tooltipY,
    };
  });
}

function describePieSlice(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    'Z',
  ].join(' ');
}

function polarToCartesian(cx, cy, radius, angleInRadians) {
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}
