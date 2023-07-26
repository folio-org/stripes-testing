/* eslint-disable cypress/no-unnecessary-waiting */
import getRandomPostfix from '../../utils/stringTools';
import { Button, TextField, TextArea, KeyValue, Checkbox, Link, Heading, Select, Pane, Modal, PaneContent, NavListItem, RichEditor, including } from '../../../../interactors';
import richTextEditor from '../../../../interactors/rich-text-editor';
import { NOTICE_CATEGORIES } from './notice-policy';
import { actionsButtons } from './newNoticePolicy';

const titles = {
  addToken: 'Add token',
  newTemplate: 'New patron notice template',
  templates: 'Patron notice templates'
};
const saveButton = Button({ id: 'footer-save-entity' });
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
    return cy.do(Link(noticePolicyTemplate.name).click());
  },

  create: (noticePolicyTemplate, autoSave = true) => {
    cy.get('#input-patron-notice-name').type(noticePolicyTemplate.name);
    cy.do([
      bodyField.fillIn(noticePolicyTemplate.body),
      descriptionField.fillIn(noticePolicyTemplate.description),
      subjectField.fillIn(noticePolicyTemplate.subject),
      bodyField.has({ value: noticePolicyTemplate.body }),
      descriptionField.has({ value: noticePolicyTemplate.description }),
      subjectField.has({ value: noticePolicyTemplate.subject }),
    ]);
    if (autoSave) { cy.get('#footer-save-entity').click(); }
  },

  chooseCategory: (category) => {
    cy.do(Select({ name: 'category' }).choose(category));
  },

  checkPreview: (previewText) => {
    cy.do(PaneContent({ id: 'patron-notice-template-pane-content' }).find(Button('Preview')).click());
    cy.expect([
      Modal(including('Preview of patron notice template')).exists(),
      Modal({ content: including(previewText) }).exists(),
    ]);
    cy.do(Button('Close').click());
  },

  startAdding() {
    return cy.do(newButton.click());
  },

  addToken(noticePolicyTemplateToken) {
    cy.do(tokenButton.click());
    cy.expect(Heading(titles.addToken).exists());
    cy.do([
      Checkbox(`${noticePolicyTemplateToken}`).click(),
      // waiting for the html body input to be available for adding symbols
      cy.wait(1000),
      addTokenButton.click(),
    ]);
    cy.do(bodyField.has({ value: `{{${noticePolicyTemplateToken}}}` }));
    return cy.wrap(noticePolicyTemplateToken);
  },

  clearBody() {
    cy.do(RichEditor().fillIn(''));
  },

  saveAndClose() {
    return cy.do([saveButton.has({ disabled: false }),
      saveButton.click(),
    ]);
  },

  checkNewButton() {
    cy.expect([
      newButton.exists(),
      newButton.should('not.be.disabled')
    ]);
  },

  checkTemplateActions() {
    return cy.do([
      actionsButton.click(),
      actionsButtons.duplicate.exists(),
      actionsButtons.duplicate.has({ visible: true }),
      actionsButtons.edit.exists(),
      actionsButtons.edit.has({ visible: true }),
      actionsButtons.delete.exists(),
      actionsButtons.delete.has({ visible: true }),
      actionsButton.click(),
    ]);
  },

  checkInitialState() {
    return cy.expect([
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
    Object.values(noticePolicyTemplate).forEach((prop) => cy.expect(Pane(noticePolicyTemplate.name).find(KeyValue({ value: prop })).exists()));
  },

  delete: () => {
    cy.do([
      actionsButton.click(),
      Button({ id: 'dropdown-clickable-delete-item' }).click(),
      Button({ id: 'clickable-delete-item-confirmation-confirm' }).click(),
    ]);
  },

  duplicateTemplate: () => {
    cy.do([
      actionsButton.click(),
      actionsButtons.duplicate.click(),
    ]);
  },

  editTemplate(name) {
    cy.do([
      NavListItem(name).click(),
      actionsButton.click(),
      actionsButtons.edit.click(),
    ]);
  },

  typeTemplateName: (noticePolicytemplateName) => {
    cy.do(nameField.fillIn(noticePolicytemplateName));
  },

  typeTemplateSubject: (noticePolicytemplateSubject) => {
    cy.do(subjectField.fillIn(noticePolicytemplateSubject));
  },

  createPatronNoticeTemplate(template) {
    this.startAdding();
    this.checkInitialState();
    this.addToken('item.title');
    this.create(template, false);
    this.chooseCategory(template.category);
    this.checkPreview(template.previewText);
    this.saveAndClose();
    this.waitLoading();
  },

  duplicatePatronNoticeTemplate(template) {
    this.duplicateTemplate();
    this.typeTemplateName(template.name);
    this.typeTemplateSubject(template.subject);
    this.checkPreview(template.previewText);
    this.saveAndClose();
    this.waitLoading();
  },
};
