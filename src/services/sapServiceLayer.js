const SAP_LOGIN_PAYLOAD = {
  CompanyDB: 'BIANCOEVENTO_PRACA',
  Password: '1234',
  UserName: 'B1i',
};

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

  const partnerResponse = await fetch(
    `/b1s/v1/BusinessPartners('${encodeURIComponent(normalizedCardCode)}')?$select=CardCode,CardName,OpenOrdersBalance,CurrentAccountBalance`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    },
  );

  if (partnerResponse.status === 404) {
    throw new Error('Card code was not found.');
  }

  if (!partnerResponse.ok) {
    throw new Error('Unable to load customer details.');
  }

  return partnerResponse.json();
}
