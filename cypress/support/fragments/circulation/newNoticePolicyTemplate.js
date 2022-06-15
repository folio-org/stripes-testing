/* eslint-disable cypress/no-unnecessary-waiting */
import getRandomPostfix from '../../utils/stringTools';
import { Button, TextField, TextArea, KeyValue, Checkbox, Link, Heading, Select, PaneSet } from '../../../../interactors';
import richTextEditor from '../../../../interactors/rich-text-editor';
import { NOTICE_CATEGORIES } from './notice-policy';
import { actionsButtons } from './newNoticePolicy';

const titles = {
  addToken: 'Add token',
  newTemplate: 'New patron notice template',
  templates: 'Patron notice templates'
};
const newButton = Button({ id: 'clickable-create-entry' });
const actionsButton = Button('Actions');
const tokenButton = Button('{ }');
const addTokenButton = Button(titles.addToken);
const nameField = TextField({ id: 'input-patron-notice-name' });
const subjectField = TextField({ id: 'input-patron-notice-subject' });
const descriptionField = TextArea({ id: 'input-patron-notice-description' });
const bodyField = richTextEditor();
const defaultUi = {
  name: `Test_template_${getRandomPostfix()}`,
  active: 'Yes',
  description: 'Template created by autotest team',
  subject: 'Subject_Test',
  body: 'Test_email_body'
};

export default {
  defaultUi,

  waitLoading() {
    cy.do(Link(titles.templates).click());
    cy.expect(Heading(titles.templates).exists());
  },

  openToSide(noticePolicyTemplate) {
    cy.do(Link(noticePolicyTemplate.name).click());
  },

  // noticePolicyTemplate must have the exact structure as newNoticePolicyTemplate.defaultUi on 14th line
  create: (noticePolicyTemplate) => {
    cy.wait(2500); // waiting for the html body input to be available for typing
    cy.get('#template-editor')
      .type('{selectAll}')
      .type(noticePolicyTemplate.body); // TODO: research why <bodyField.fillIn(noticePolicyTemplate.body)> doesn't work
    cy.do([
      nameField.fillIn(noticePolicyTemplate.name),
      descriptionField.fillIn(noticePolicyTemplate.description),
      subjectField.fillIn(noticePolicyTemplate.subject),
    ]);
  },

  startAdding() {
    cy.do(newButton.click());
  },

  addToken(noticePolicyTemplate) {
    cy.do(tokenButton.click());
    cy.expect(Heading(titles.addToken).exists());
    cy.do([
      Checkbox(`${noticePolicyTemplate.token}`).click(),
      addTokenButton.click(),
    ]);
    cy.do(bodyField.has({ value: `${noticePolicyTemplate.body}{{${noticePolicyTemplate.token}}}` }));
  },

  save() {
    cy.do([
      Button({ id: 'footer-save-entity' }).click(),
      Button({ icon: 'times' }).click(),
    ]);
  },

  checkNewButton() {
    cy.expect([
      newButton.exists(),
      newButton.should('not.be.disabled')
    ]);
  },

  checkTemplateActions(noticePolicyTemplate) {
    cy.expect([
      this.openToSide(noticePolicyTemplate),
      actionsButton.click(),
      actionsButton.click(),
      actionsButtons.duplicate.exists(),
      actionsButtons.duplicate.has({ visible: true }),
      actionsButtons.edit.exists(),
      actionsButtons.duplicate.exists({ visible: true }),
      actionsButtons.delete.exists(),
      actionsButtons.duplicate.exists({ visible: true }),
    ]);
  },

  checInitialState() {
    cy.expect([
      Heading(titles.newTemplate).exists(),
      nameField.exists(),
      descriptionField.exists(),
      subjectField.exists(),
      bodyField.exists(),
      tokenButton.exists(),
      nameField.has({ value: '' }),
      descriptionField.has({ value: '' }),
      subjectField.has({ value: '' }),
      bodyField.has({ value: '' }),
      Select({ id: 'input-patron-notice-subject' }).has({ value: 'Loan' }),
      Button({ id: 'accordion-toggle-button-email-template-form' }).has({ ariaExpanded: true }),
      Checkbox({ id: 'input-patron-notice-active' }).has({ checked:'true' }),
      cy.get('select[name="category"]').get('option').each(($option, index) => {
        if (index <= 5) {
          expect($option).to.contain(Object.values(NOTICE_CATEGORIES)[index].name);
        }
      })
    ]);
  },

  checkAfterSaving: (noticePolicyTemplate) => {
    Object.values(noticePolicyTemplate).forEach((prop) => cy.expect(PaneSet().find(KeyValue({ value: prop }))));
  },


  delete: () => {
    cy.do([
      actionsButton.click(),
      Button({ id: 'dropdown-clickable-delete-item' }).click(),
      Button({ id: 'clickable-delete-item-confirmation-confirm' }).click(),
    ]);
  }
};
