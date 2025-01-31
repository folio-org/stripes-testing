Cypress.Commands.add('getEHoldingsCustomLabelsViaAPI', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'eholdings/custom-labels',
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    return body.data;
  });
});

Cypress.Commands.add('getEHoldingsTitlesViaAPI', (titleName) => {
  cy.okapiRequest({
    method: 'GET',
    path: `eholdings/titles?page=1&filter[name]=${titleName}&count=1`,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getEholdingsProxiesViaAPI', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'eholdings/root-proxy',
    isDefaultSearchParamsRequired: false,
  }).then((rootResponse) => {
    cy.okapiRequest({
      method: 'GET',
      path: 'eholdings/proxy-types?limit=15',
      isDefaultSearchParamsRequired: false,
    }).then(({ body }) => {
      return body.data.map((proxy) => {
        if (proxy.attributes.id === rootResponse.body.data.attributes.proxyTypeId) return `Inherited - ${proxy.attributes.name}`;
        else return proxy.attributes.name;
      });
    });
  });
});
