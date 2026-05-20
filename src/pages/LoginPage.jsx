import { useState } from 'react';
import customerPortalLogo from '../assets/customer-portal-logo.svg';

export default function LoginPage({
  credentials,
  onChange,
  onSubmit,
  onCardSubmit,
  error,
  isAuthenticating = false,
}) {
  const [loginMode, setLoginMode] = useState('card');
  const [cardNumber, setCardNumber] = useState('');
  const isCardLogin = loginMode === 'card';

  function handleCardSubmit(event) {
    event.preventDefault();
    onCardSubmit(cardNumber);
  }

  return (
    <div className="login-shell">
      <div className="login-backdrop" />
      <section className="login-layout">
        <div className="login-brand-panel">
          <img
            className="login-logo"
            src={customerPortalLogo}
            alt="Customer Portal"
          />
          <div className="login-brand-copy">
            <span className="login-kicker">B2B Customer Workspace</span>
            <h2>Access your orders, invoices, shipments, and partner resources.</h2>
            <p>
              Sign in to continue into the customer portal and manage your account
              activity from one place.
            </p>
          </div>
          <div className="login-highlights">
            <div className="login-highlight-card">
              <strong>Live account view</strong>
              <span>Open orders, invoice totals, and shipment status in one dashboard.</span>
            </div>
            <div className="login-highlight-card">
              <strong>Partner support</strong>
              <span>Training resources and product information available after sign-in.</span>
            </div>
          </div>
        </div>

        <div className="login-panel">
          <div className="login-panel-copy">
            <span className="login-kicker">Welcome Back</span>
            <h2>Login to Customer Portal</h2>
            <p>
              {isCardLogin
                ? 'Use your customer card to open the dashboard.'
                : 'Use your portal credentials to open the dashboard.'}
            </p>
          </div>

          <div className="login-mode-toggle" aria-label="Login options">
            <button
              className={isCardLogin ? 'is-active' : ''}
              type="button"
              onClick={() => setLoginMode('card')}
            >
              Card Login
            </button>
            <button
              className={!isCardLogin ? 'is-active' : ''}
              type="button"
              onClick={() => setLoginMode('credentials')}
            >
              Credential Login
            </button>
          </div>

          {isCardLogin ? (
            <form className="login-form" onSubmit={handleCardSubmit}>
              <label className="login-field">
                <span>CardCode</span>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(event) => setCardNumber(event.target.value)}
                  placeholder="20079"
                  autoComplete="off"
                  disabled={isAuthenticating}
                />
              </label>

              {error ? <div className="login-error">{error}</div> : null}

              <button className="login-submit" type="submit" disabled={isAuthenticating}>
                {isAuthenticating ? 'Signing In...' : 'Sign In with CardCode'}
              </button>
            </form>
          ) : (
            <form className="login-form" onSubmit={onSubmit}>
              <label className="login-field">
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  value={credentials.email}
                  onChange={onChange}
                  placeholder="sales@sohostore.com"
                  autoComplete="email"
                />
              </label>

              <label className="login-field">
                <span>Password</span>
                <input
                  type="password"
                  name="password"
                  value={credentials.password}
                  onChange={onChange}
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
              </label>

              {error ? <div className="login-error">{error}</div> : null}

              <button className="login-submit" type="submit">
                Sign In
              </button>
            </form>
          )}

          {isCardLogin ? (
            <div className="login-demo-note">
              Demo CardCode: <strong>20079</strong>
            </div>
          ) : (
            <div className="login-demo-note">
              Demo credentials: <strong>sales@sohostore.com</strong> / <strong>portal123</strong>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
