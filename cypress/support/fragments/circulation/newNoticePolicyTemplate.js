/* eslint-disable cypress/no-unnecessary-waiting */
import getRandomPostfix from '../../utils/stringTools';
import { Button, TextField, TextArea, KeyValue, Checkbox, Link, Heading } from '../../../../interactors';
import richTextEditor from '../../../../interactors/rich-text-editor';

const actionsButton = Button('Actions');
const tokenButton = Button('{ }');
const addTokenButton = Button('Add token');
const nameField = TextField({ id: 'input-patron-notice-name' });

const defaultUi = {
  name: `Test_template_${getRandomPostfix()}`,
  description: 'Template created by autotest team',
  subject: 'Subject_Test',
  body: 'Test_email_body',
};

export default {
  defaultUi,
  waitLoading() {
    cy.do(Link('Patron notice templates').click());
    cy.expect(Heading('Patron notice templates').exists());
  },
  create(patronNoticeTemplate) {
    cy.do(Button({ id: 'clickable-create-entry' }).click());
    cy.wait(3000);
    this.fillGeneralInformation(patronNoticeTemplate);
    cy.do(Button({ id: 'footer-save-entity' }).click());
  },
  // patronNoticeTemplate must have the exact structure as newNoticePolicyTemplate.defaultUi on 14th line
  fillGeneralInformation: (patronNoticeTemplate) => {
    cy.do([
      nameField.fillIn(patronNoticeTemplate.name),
      TextArea({ id: 'input-patron-notice-description' }).fillIn(patronNoticeTemplate.description),
      TextField({ id: 'input-patron-notice-subject' }).fillIn(patronNoticeTemplate.subject),
      richTextEditor().fillIn(patronNoticeTemplate.body),
    ]);
  },
  check: (patronNoticeTemplate) => {
    cy.expect([
      KeyValue({ value: patronNoticeTemplate.name }).exists(),
      KeyValue({ value: patronNoticeTemplate.description }).exists(),
      KeyValue({ value: patronNoticeTemplate.subject }).exists(),
      KeyValue({ value: patronNoticeTemplate.body }).exists(),
    ]);
  },
  addToken(patronNoticeTemplate) {
    cy.do([
      tokenButton.click(),
      Checkbox(`${patronNoticeTemplate.tokenName}`).click(),
      addTokenButton.click(),
    ]);
  },
  openToSide(patronNoticeTemplate) {
    cy.do(Link(patronNoticeTemplate.name).click());
  },
  delete: () => {
    cy.do([
      actionsButton.click(),
      Button({ id: 'dropdown-clickable-delete-item' }).click(),
      Button({ id: 'clickable-delete-item-confirmation-confirm' }).click(),
    ]);
  }
};
