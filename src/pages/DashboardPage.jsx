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
  orderedProducts,
  credit,
  navigation,
  openMenus,
  setOpenMenus,
}) {
  const [activeStatusIndex, setActiveStatusIndex] = useState(null);
  const maxSalesValue = Math.max(...salesSeries.values, 0);
  const totalStatusCount = statusDistribution.reduce(
    (sum, item) => sum + item.count,
    0,
  );
  const pieSlices = buildPieSlices(statusDistribution);
  const activeStatus =
    activeStatusIndex === null ? null : (pieSlices[activeStatusIndex] ?? null);

  return (
    <div className="portal-shell">
      <aside className="sidebar">
        <div>
          <div className="brand-block">
            <img
              className="brand-logo"
              src={customerPortalLogo}
              alt="Customer Portal"
            />
          </div>

          <nav className="sidebar-nav">
            {navigation.map((item) => {
              const Icon = navIcons[item.icon];
              const hasChildren = Boolean(item.children?.length);
              const isOpen = Boolean(openMenus[item.label]);

              if (hasChildren) {
                return (
                  <div key={item.label} className="nav-group">
                    <button
                      type="button"
                      className={`nav-item nav-toggle ${item.active ? 'is-active' : ''}`}
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
                  className={`nav-item ${item.active ? 'is-active' : ''}`}
                  href="/"
                  onClick={(event) => event.preventDefault()}
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

          <div className="copyright">© 2025 Bianco Evento. All rights reserved.</div>
        </div>
      </aside>

      <main className="dashboard">
        <header className="topbar">
          <div>
            <h1>
              Welcome back, {company.name} <span className="wave-hand">{'\u{1F44B}'}</span>
            </h1>
            <p>Here&apos;s what&apos;s happening with your account today.</p>
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
              <h2>Sales Overview</h2>
            </div>
            <div className="chart-legend">
              <span className="legend-item">
                <i className="solid-line" />
                Static Sales Data
              </span>
            </div>
            <div className="line-chart">
              <div className="chart-y-axis">
                {buildYAxisTicks(maxSalesValue).map((tick) => (
                  <span key={tick}>{tick}</span>
                ))}
              </div>
              <div className="chart-stage">
                {[...Array(6)].map((_, index) => (
                  <div key={index} className="grid-line" />
                ))}
                <svg viewBox="0 0 560 240" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(190, 86, 93, 0.26)" />
                      <stop offset="100%" stopColor="rgba(190, 86, 93, 0.02)" />
                    </linearGradient>
                  </defs>
                  <polyline
                    fill="url(#salesFill)"
                    stroke="none"
                    points={`${buildAreaPoints(salesSeries.values, maxSalesValue)} 560,240 0,240`}
                  />
                  <polyline
                    fill="none"
                    stroke="#bb666f"
                    strokeWidth="3"
                    points={buildLinePoints(salesSeries.values, maxSalesValue)}
                  />
                  {salesSeries.values.map((value, index) => (
                    <circle
                      key={`value-${salesSeries.labels[index]}`}
                      cx={getX(index, salesSeries.labels.length)}
                      cy={getY(value, maxSalesValue)}
                      r="4"
                      fill="#bb666f"
                    />
                  ))}
                </svg>
                <div className="chart-months">
                  {salesSeries.labels.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
              </div>
            </div>
          </article>

          <article className="panel donut-panel">
            <div className="panel-heading">
              <h2>Order Status Distribution</h2>
            </div>
            <div className="donut-wrap">
              <div
                className={`pie-chart-shell ${activeStatus ? 'has-active' : ''}`}
                onMouseLeave={() => setActiveStatusIndex(null)}
              >
                <div className="donut-chart">
                  <svg viewBox="0 0 220 220" className="pie-chart-svg" aria-label="Order status distribution">
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
              <a href="/" onClick={(event) => event.preventDefault()}>
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
              <a href="/" onClick={(event) => event.preventDefault()}>
                View all products
              </a>
            </div>
            <div className="product-list">
              {orderedProducts.map((product) => (
                <div key={product.name} className="product-row">
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
              <button type="button">Edit</button>
            </div>
            <div className="company-body">
              <div className="company-icon">
                <BuildingIcon />
              </div>
              <div className="company-columns">
                <div>
                  <label>Company Name</label>
                  <p>{company.name}</p>
                  <label>Customer ID</label>
                  <p>{company.customerId}</p>
                  <label>Email</label>
                  <p>{company.email}</p>
                </div>
                <div>
                  <label>Phone</label>
                  <p>{company.phone}</p>
                  <label>VAT Number</label>
                  <p>{company.vat}</p>
                  <label>Address</label>
                  <p>{company.address}</p>
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
      </main>
    </div>
  );
}

function buildLinePoints(values, maxValue) {
  return values
    .map((value, index) => `${getX(index, values.length)},${getY(value, maxValue)}`)
    .join(' ');
}

function buildAreaPoints(values, maxValue) {
  return values
    .map((value, index) => `${getX(index, values.length)},${getY(value, maxValue)}`)
    .join(' ');
}

function getX(index, total) {
  if (total <= 1) {
    return 0;
  }

  return (560 / (total - 1)) * index;
}

function getY(value, maxValue) {
  const minY = 24;
  const maxY = 216;
  return maxY - ((value / maxValue) * (maxY - minY));
}

function buildYAxisTicks(maxValue) {
  const step = Math.max(1, Math.ceil(maxValue / 5));
  const ticks = [];

  for (let tick = step * 5; tick >= 0; tick -= step) {
    ticks.push(tick);
  }

  return ticks;
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
