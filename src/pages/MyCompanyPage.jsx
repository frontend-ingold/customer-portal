import { BuildingIcon, CreditIcon, HeadsetIcon, ShipmentIcon, UsersIcon } from '../components/Icons';

export default function MyCompanyPage({ company, credit }) {
  const contacts = company.contactPersons?.length
    ? company.contactPersons
    : [{ name: company.contactPerson || '-', email: company.email || '-' }];
  const billingAddress = normalizeAddress(company.billingAddress, company.address, company.phone);
  const shippingAddress = normalizeAddress(company.shippingAddress, company.address, company.phone);
  const carrier = getCarrier(company.shippingType);
  const currency = company.currency || company.Currency || company.defaultCurrency || '-';

  return (
    <div className="my-company-page">
      <header className="company-hero">
        <div className="company-identity">
          <div className="company-avatar">
            <BuildingIcon />
          </div>
          <div>
            <span className="company-kicker">My Company</span>
            <h1>{company.name || '-'}</h1>
            <p>{company.customerId ? `CardCode ${company.customerId}` : 'Customer account'}</p>
          </div>
        </div>
        <div className="company-credit-orb">
          <span>Credit Limit</span>
          <strong>{credit.limit || company.creditLimit || '-'}</strong>
        </div>
      </header>

      <section className="company-profile-grid">
        <article className="company-section company-overview">
          <div className="company-section-title">
            <BuildingIcon />
            <h2>Company Details</h2>
          </div>
          <div className="company-field-grid">
            <InfoField label="Company Name" value={company.name} />
            <InfoField label="Phone" value={company.phone} />
            <InfoField label="Email" value={company.email} />
            <InfoField label="Currency" value={currency} />
          </div>
        </article>

        <article className="company-section company-shipping">
          <div className="company-section-title">
            <ShipmentIcon />
            <h2>Shipping Type</h2>
          </div>
          <div className="carrier-card">
            
            <div>
              <strong>{company.shippingType || '-'}</strong>
              <span>Preferred delivery method</span>
            </div>
          </div>
        </article>

        <article className="company-section company-contacts">
          <div className="company-section-title">
            <UsersIcon />
            <h2>Contact Persons</h2>
          </div>
          <div className="contact-list">
            {contacts.map((contact, index) => (
              <div className="contact-card" key={`${contact.email}-${index}`}>
                <span>{getInitials(contact.name)}</span>
                <div>
                  <strong>{contact.name || '-'}</strong>
                  <p>{contact.email || '-'}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="company-section company-sales">
          <div className="company-section-title">
            <HeadsetIcon />
            <h2>Sales Representative</h2>
          </div>
          <div className="sales-profile">
            <div className="sales-avatar">
              <HeadsetIcon />
            </div>
            <div>
              <strong>{company.salesEmployee || '-'}</strong>
              <p>{company.salesEmployeeEmail || '-'}</p>
              <p>{company.salesEmployeePhone || '-'}</p>
            </div>
          </div>
        </article>
      </section>

      <section className="company-section company-business">
        <div className="company-section-title">
          <CreditIcon />
          <h2>Business Details</h2>
        </div>
        <div className="business-layout">
          <AddressBlock title="Shipping Address" lines={shippingAddress} />
          <AddressBlock title="Billing Address" lines={billingAddress} />
        </div>
      </section>
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div className="company-info-field">
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}

function AddressBlock({ title, lines }) {
  return (
    <article className="company-address-card">
      <h3>{title}</h3>
      {lines.length ? (
        lines.map((line) => <p key={line}>{line}</p>)
      ) : (
        <p>-</p>
      )}
    </article>
  );
}

function normalizeAddress(address, fallbackAddress, phone) {
  if (Array.isArray(address) && address.length) {
    const firstAddress = address[0];

    if (typeof firstAddress === 'string') {
      return address.filter(Boolean);
    }

    return [
      firstAddress.street,
      [firstAddress.city, firstAddress.country, firstAddress.postcode].filter(Boolean).join(', '),
      firstAddress.telephone || phone,
    ].filter(Boolean);
  }

  return [fallbackAddress, phone ? `T: ${phone}` : ''].filter(Boolean);
}

function getCarrier(value = '') {
  const carrier = value.toLowerCase();

  if (carrier.includes('ups')) {
    return { label: 'UPS', className: 'ups' };
  }

  if (carrier.includes('dhl')) {
    return { label: 'DHL', className: 'dhl' };
  }

  if (carrier.includes('fedex')) {
    return { label: 'FX', className: 'fedex' };
  }

  return { label: 'SHIP', className: 'default' };
}

function getInitials(name = '') {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return initials || 'CP';
}
