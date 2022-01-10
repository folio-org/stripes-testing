import { Select, Section, Button } from '../../../../interactors';
import eHoldingsProviderView from './eHoldingsProviderView';

const availableProxies = [
  'chalmers',
  'MJProxy',
  'TestingFolio'
];
const proxySelect = Select('Proxy');

export default {
  waitLoading: (providerName) => {
    cy.expect(Section({ id : providerName.replaceAll(' ', '-').toLowerCase() }).exists());
    cy.expect(proxySelect.exists());
  },
  changeProxy: () => {
    return cy.then(() => proxySelect.value())
      .then(selectedProxy => {
        const notSelectedProxy = availableProxies.filter(availableProxy => availableProxy.toLowerCase() !== selectedProxy)[0];
        cy.do(proxySelect.choose(notSelectedProxy));
        return cy.wrap(notSelectedProxy);
      });
  },
  saveAndClose:() => {
    cy.do(Button('Save & close').click());
    // TODO: need to wait proxy update and make extra page refresh. Need to clarify the reason with developers and change static waiter to dynamic waiter
    cy.wait(5000);
    cy.reload();
    eHoldingsProviderView.waitLoading();
  }
};
