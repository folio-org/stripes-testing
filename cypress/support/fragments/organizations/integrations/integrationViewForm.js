import { Button, KeyValue, Section, including } from '../../../../../interactors';
import { DEFAULT_WAIT_TIME } from '../../../constants';
import IntegrationEditForm from './integrationEditForm';

const integrationViewForm = Section({ id: 'integration-view' });
const schedulingSection = Section({ id: 'scheduling' });

const actionsButton = Button('Actions');
const editButton = Button('Edit');

export default {
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
    cy.expect(integrationViewForm.exists());
  },
  verifySchedulingTime(expectedTime) {
    cy.expect(schedulingSection.find(KeyValue('Time')).has({ value: including(expectedTime) }));
  },
  openIntegrationEditForm() {
    cy.do([actionsButton.click(), editButton.click()]);

    IntegrationEditForm.waitLoading();

    return IntegrationEditForm;
  },
};
