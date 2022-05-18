import getRandomPostfix from '../../utils/stringTools';
import { Button, TextField, TextArea, KeyValue, Checkbox } from '../../../../interactors';

const tokenName = 'item.title'
const actionsButton = Button('Actions');
const tokenButton = Button('{ }')
const addTokenButton = Button('Add token')
const nameField = TextField({ id: 'input-patron-notice-name' });
const itemTitleCheckbox = Checkbox(`${tokenName}`)

export default {
  defaultUiPatronNoticeTemplate : {
    name: `Test_template_${getRandomPostfix()}`,
    description: 'Template created by autotest team',
    subject: 'Subject_Test',
    body: `Test_email_body {{${tokenName}}}`
  },
  createTemplate(patronNoticeTemplate) {
    cy.intercept('/patron-notice-policy-storage/patron-notice-policies**').as('request-patron-notice-policies')
    cy.do(Button({ id: 'clickable-create-entry' }).click());
    cy.wait('@request-patron-notice-policies')
    this.fillGeneralInformation(patronNoticeTemplate);
    cy.do(tokenButton.click())
    cy.wait(2000)
    cy.do(itemTitleCheckbox.click())
    cy.do(addTokenButton.click())
    cy.do(Button({ id: 'footer-save-entity' }).click());
    cy.wait('@request-patron-notice-policies')
  },
  fillGeneralInformation: (patronNoticeTemplate) => {
    cy.get('#template-editor')
      .type('{selectAll}')
      .type(patronNoticeTemplate.body.substr(0, 16));
    cy.do([
      nameField.fillIn(patronNoticeTemplate.name),
      TextArea({ id: 'input-patron-notice-description' }).fillIn(patronNoticeTemplate.description),
      TextField({ id: 'input-patron-notice-subject' }).fillIn(patronNoticeTemplate.subject),
    ]);
  },
  checkTemplate: (patronNoticeTemplate) => {
    cy.log(KeyValue({ value:patronNoticeTemplate.body}))
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
