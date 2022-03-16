import getRandomPostfix from '../../utils/stringTools';
import { Button, TextField, TextArea, KeyValue } from '../../../../interactors';

const actionsButton = Button('Actions');
const nameField = TextField({ id: 'input-patron-notice-name' });

export default {
  defaultUiPatronNoticeTemplate : {
    name: `Test_template_${getRandomPostfix()}`,
    description: 'Template created by autotest team',
    subject: 'Subject_Test',
    body: 'Test_email_body',
  },
  createTemplate(patronNoticeTemplate) {
    cy.do(Button({ id: 'clickable-create-entry' }).click());
    this.fillGeneralInformation(patronNoticeTemplate);
    cy.do(Button({ id: 'footer-save-entity' }).click());
  },
  fillGeneralInformation: (patronNoticeTemplate) => {
    cy.get('#template-editor')
      .type('{selectAll}')
      .type(patronNoticeTemplate.body);
    cy.do([
      nameField.fillIn(patronNoticeTemplate.name),
      TextArea({ id: 'input-patron-notice-description' }).fillIn(patronNoticeTemplate.description),
      TextField({ id: 'input-patron-notice-subject' }).fillIn(patronNoticeTemplate.subject),
    ]);
  },
  checkTemplate: (patronNoticeTemplate) => {
    cy.expect([
      KeyValue({ value: patronNoticeTemplate.name }).exists(),
      KeyValue({ value: patronNoticeTemplate.description }).exists(),
      KeyValue({ value: patronNoticeTemplate.subject }).exists(),
      KeyValue({ value: patronNoticeTemplate.body }).exists(),
    ]);
  },
  deleteTemplate: () => {
    cy.do([
      actionsButton.click(),
      Button({ id: 'dropdown-clickable-delete-item' }).click(),
      Button({ id: 'clickable-delete-item-confirmation-confirm' }).click(),
    ]);
  }
};
