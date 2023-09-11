import { Button, KeyValue, Section } from '../../../../interactors';

const waitLoading = () => {
  cy.expect(Section({ id: 'providerShowProviderSettings' }).exists());
};

export default {
  waitLoading,
  edit: () => cy.do(Button({ id: 'provider-edit-link' }).click()),
  checkProxy: (proxyName) => cy.expect(KeyValue('Proxy', { value: proxyName }).exists()),
};
