import { Button, HTML, Section, Select, including } from '../../../../interactors';
import { getLongDelay } from '../../utils/cypressTools';

const proxySelect = Select('Proxy');
const saveAndCloseButton = Button('Save & close');

const API = {
  getProxyTypesByApi() {
    return cy
      .okapiRequest({
        path: 'eholdings/proxy-types',
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => response.body.data);
  },
};

export default {
  waitLoading: (providerName) => {
    cy.intercept('eholdings/providers/**').as('getProviderProperties');
    cy.wait('@getProviderProperties', getLongDelay()).then((request) => {
      cy.expect(Section({ id: providerName.replaceAll(' ', '-').toLowerCase() }).exists());
      cy.expect(proxySelect.has({ value: request.response.body.data.attributes.proxy.id }));
    });
  },

  changeProxy: () => {
    return cy
      .then(() => proxySelect.value())
      .then((selectedProxy) => {
        API.getProxyTypesByApi().then((proxyTypes) => {
          const availableProxies = proxyTypes.map((proxyType) => proxyType.attributes.name);
          const notSelectedProxy = availableProxies.filter(
            (availableProxy) => availableProxy.toLowerCase() !== selectedProxy,
          )[1];
          cy.do(proxySelect.choose(notSelectedProxy));
          cy.expect(proxySelect.find(HTML(including(notSelectedProxy))).exists());
          return cy.wrap(notSelectedProxy);
        });
      });
  },

  saveAndClose() {
    cy.expect(saveAndCloseButton.exists());
    cy.do(saveAndCloseButton.click());
  },
  ...API,
};
