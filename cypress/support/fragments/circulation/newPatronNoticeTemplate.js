import getRandomPostfix from '../../utils/stringTools';
import { Button, TextField, TextArea, NavListItem } from '../../../../interactors';

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
    cy.get('#template-editor').type(patronNoticeTemplate.body);
    cy.do([
      nameField.fillIn(patronNoticeTemplate.name),
      TextArea({ id: 'input-patron-notice-description' }).fillIn(patronNoticeTemplate.description),
      TextField({ id: 'input-patron-notice-subject' }).fillIn(patronNoticeTemplate.subject),
    ]);
  },
  checkTemplate: (patronNoticeTemplateName) => {
    cy.expect(NavListItem(patronNoticeTemplateName).exists());
  },
  deleteTemplate: () => {
    cy.do([
      actionsButton.click(),
      Button({ id: 'dropdown-clickable-delete-item' }).click(),
      Button({ id: 'clickable-delete-item-confirmation-confirm' }).click(),
    ]);
  }
};
