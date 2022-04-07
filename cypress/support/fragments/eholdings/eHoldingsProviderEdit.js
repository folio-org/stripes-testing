import { Select, Section, Button } from '../../../../interactors';
import { getLongDelay } from '../../utils/cypressTools';
import eHoldingsProviderView from './eHoldingsProviderView';

const availableProxies = [
  'chalmers',
  'MJProxy',
  'TestingFolio'
];
const proxySelect = Select('Proxy');

export default {
  waitLoading: (providerName) => {
    cy.intercept('eholdings/providers/**').as('getProviderProperties');
    cy.wait('@getProviderProperties', getLongDelay()).then(request => {
      cy.expect(Section({ id : providerName.replaceAll(' ', '-').toLowerCase() }).exists());
      cy.expect(proxySelect.has({ value: request.response.body.data.attributes.proxy.id }));
    });
  },
  changeProxy: () => {
    return cy.then(() => proxySelect.value())
      .then(selectedProxy => {
        const notSelectedProxy = availableProxies.filter(availableProxy => availableProxy.toLowerCase() !== selectedProxy)[0];
        cy.do(proxySelect.choose(notSelectedProxy));
        cy.expect(proxySelect.has({ value: notSelectedProxy.toLowerCase() }));
        return cy.wrap(notSelectedProxy);
      });
  },
  saveAndClose:() => {
    cy.do(Button('Save & close').click());
    eHoldingsProviderView.waitLoading();
  }
};
