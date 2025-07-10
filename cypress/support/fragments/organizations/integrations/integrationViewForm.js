import { Button, Section } from '../../../../../interactors';
import { DEFAULT_WAIT_TIME } from '../../../constants';
import IntegrationEditForm from './integrationEditForm';

const integrationViewForm = Section({ id: 'integration-view' });

const actionsButton = Button('Actions');
const editButton = Button('Edit');

export default {
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
    cy.expect(integrationViewForm.exists());
  },
  openIntegrationEditForm() {
    cy.do([actionsButton.click(), editButton.click()]);

    IntegrationEditForm.waitLoading();

    return IntegrationEditForm;
  },
};
