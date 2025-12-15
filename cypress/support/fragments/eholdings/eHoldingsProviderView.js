import { Button, KeyValue, Section, PaneHeader } from '../../../../interactors';

const closeButton = Button({ icon: 'times' });

const waitLoading = () => {
  cy.expect(Section({ id: 'providerShowProviderSettings' }).exists());
};

export default {
  waitLoading,
  edit: () => cy.do(Button({ id: 'provider-edit-link' }).click()),
  checkProxy: (proxyName) => cy.expect(KeyValue('Proxy', { value: proxyName }).exists()),
  close: () => {
    cy.do(PaneHeader().find(closeButton).click());
  },
};
