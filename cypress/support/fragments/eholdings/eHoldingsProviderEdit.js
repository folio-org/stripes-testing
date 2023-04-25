import { Select, Section, Button, HTML, including } from '../../../../interactors';
import { getLongDelay } from '../../utils/cypressTools';
import eHoldingsProviderView from './eHoldingsProviderView';

const availableProxies = [
  'guestaccess',
  'Hosted EZproxy',
  'perma'
];
const proxySelect = Select('Proxy');

export default {
  waitLoading: (providerName) => {
    cy.intercept('eholdings/providers/**').as('getProviderProperties');
    cy.wait('@getProviderProperties', getLongDelay()).then(request => {
      cy.expect(Section({ id : providerName.replaceAll(' ', '-').toLowerCase() }).exists());
      cy.expect(proxySelect.has({ value:  request.response.body.data.attributes.proxy.id }));
    });
  },
  changeProxy: () => {
    return cy.then(() => proxySelect.value())
      .then(selectedProxy => {
        const notSelectedProxy = availableProxies.filter(availableProxy => availableProxy.toLowerCase() !== selectedProxy)[0];
        cy.do(proxySelect.choose(notSelectedProxy));
        cy.expect(proxySelect.find(HTML(including(notSelectedProxy))).exists());
        return cy.wrap(notSelectedProxy);
      });
  },
  saveAndClose:() => {
    cy.do(Button('Save & close').click());
    eHoldingsProviderView.waitLoading();
  }
};
