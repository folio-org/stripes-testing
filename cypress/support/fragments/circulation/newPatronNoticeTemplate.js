import getRandomPostfix from '../../utils/stringTools';
import { Button, TextField, TextArea, KeyValue, Checkbox, Link, Heading } from '../../../../interactors';

const tokenName = 'item.title';
const actionsButton = Button('Actions');
const tokenButton = Button('{ }');
const addTokenButton = Button('Add token');
const nameField = TextField({ id: 'input-patron-notice-name' });
const itemTitleCheckbox = Checkbox(`${tokenName}`);

export default {
  defaultUiPatronNoticeTemplate : {
    name: `Test_template_${getRandomPostfix()}`,
    description: 'Template created by autotest team',
    subject: 'Subject_Test',
    body: `Test_email_body {{${tokenName}}}`
  },
  waitLoading() { cy.expect(Heading('Patron notice templates').exists()); },

  createTemplate(patronNoticeTemplate) {
    cy.do(Button({ id: 'clickable-create-entry' }).click());
    // waiting the form to load
    cy.wait(1000);
    this.fillGeneralInformation(patronNoticeTemplate);
    cy.do(tokenButton.click());
    cy.do(itemTitleCheckbox.click());
    cy.do(addTokenButton.click());
    cy.do(Button({ id: 'footer-save-entity' }).click());
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
    cy.expect([
      KeyValue({ value: patronNoticeTemplate.name }).exists(),
      KeyValue({ value: patronNoticeTemplate.description }).exists(),
      KeyValue({ value: patronNoticeTemplate.subject }).exists(),
      KeyValue({ value: patronNoticeTemplate.body }).exists(),
    ]);
  },
  openTemplateToSide(patronNoticeTemplate) {
    cy.do(Link(patronNoticeTemplate.name).click());
  },
  deleteTemplate: () => {
    cy.do([
      actionsButton.click(),
      Button({ id: 'dropdown-clickable-delete-item' }).click(),
      Button({ id: 'clickable-delete-item-confirmation-confirm' }).click(),
    ]);
  }
};
