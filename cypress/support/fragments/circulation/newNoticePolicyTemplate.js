/* eslint-disable cypress/no-unnecessary-waiting */
import getRandomPostfix from '../../utils/stringTools';
import { Button, TextField, TextArea, KeyValue, Checkbox, Link, Heading } from '../../../../interactors';
import richTextEditor from '../../../../interactors/rich-text-editor';
import { NOTICE_CATEGORIES } from './notice-policy';

const newButton = Button({ id: 'clickable-create-entry' });
const actionsButton = Button('Actions');
const tokenButton = Button('{ }');
const addTokenButton = Button('Add token');
const nameField = TextField({ id: 'input-patron-notice-name' });
const subjectField = TextField({ id: 'input-patron-notice-subject' });
const descriptionField = TextArea({ id: 'input-patron-notice-description' });
const bodyField = richTextEditor();

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
  clickNew() {
    cy.do(newButton.click());
  },
  create(patronNoticeTemplate) {
    this.checkForm();
    this.fillGeneralInformation(patronNoticeTemplate);
  },
  checkNewButton() {
    cy.expect([
      newButton.exists(),
      cy.get('[id="clickable-create-entry"]').should('not.be.disabled')
    ]);
  },
  save() {
    cy.do(Button({ id: 'footer-save-entity' }).click());
  },
  checkForm() {
    cy.expect([
      Heading('New patron notice template').exists(),
      nameField.exists(),
      tokenButton.exists(),
      descriptionField.exists(),
      subjectField.exists(),
      bodyField.exists(),
      cy.get('[id="input-patron-notice-description"]').should('have.value', ''),
      cy.get('[id="input-patron-notice-active"]').should('be.checked'),
      cy.get('select[name="category"]').get('option').each(($option, index) => {
        if (index <= 5) {
          expect($option).to.contain(Object.values(NOTICE_CATEGORIES)[index].name);
        }
      })
    ]);
  },
  // patronNoticeTemplate must have the exact structure as newNoticePolicyTemplate.defaultUi on 14th line
  fillGeneralInformation: (patronNoticeTemplate) => {
    cy.do([
      descriptionField.fillIn(patronNoticeTemplate.description),
      subjectField.fillIn(patronNoticeTemplate.subject),
      bodyField.fillIn(patronNoticeTemplate.body),
      nameField.fillIn(patronNoticeTemplate.name),
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
    cy.do(tokenButton.click());
    cy.expect(Heading('Add token').exists());
    cy.do([
      Checkbox(`${patronNoticeTemplate.token}`).click(),
      addTokenButton.click(),
    ]);
    cy.contains(patronNoticeTemplate.token).should('be.visible');
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
