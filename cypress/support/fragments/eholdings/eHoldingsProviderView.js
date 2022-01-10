import { Button, KeyValue, Section } from '../../../../interactors';
import eHoldingsProviderEdit from './eHoldingsProviderEdit';

const waitLoading = () => {
  cy.expect(Section({ id: 'providerShowProviderSettings' }).exists());
};

export default {
  waitLoading,
  edit:(providerName) => {
    cy.do(Button({ id:'provider-edit-link' }).click());
    eHoldingsProviderEdit.waitLoading(providerName);
  },
  checkProxy:(proxyName) => {
    cy.expect(KeyValue('Proxy', { value: proxyName }).exists());
  }
};
