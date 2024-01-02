import { Button, Section } from '../../../../../interactors';
import IntegrationEditForm from './integrationEditForm';

const integrationViewForm = Section({ id: 'integration-view' });

const actionsButton = Button('Actions');
const editButton = Button('Edit');

export default {
  waitLoading() {
    cy.expect(integrationViewForm.exists());
  },
  openIntegrationEditForm() {
    cy.do([actionsButton.click(), editButton.click()]);

    IntegrationEditForm.waitLoading();

    return IntegrationEditForm;
  },
};
