/* eslint-disable cypress/no-unnecessary-waiting */
import moment from 'moment';
import getRandomPostfix from '../../../../utils/stringTools';
import {
  Accordion,
  Button,
  TextField,
  TextArea,
  KeyValue,
  Checkbox,
  Link,
  Heading,
  Select,
  Pane,
  Modal,
  PaneContent,
  NavListItem,
  RichEditor,
  including,
  MetaSection,
  Form,
} from '../../../../../../interactors';
import richTextEditor from '../../../../../../interactors/rich-text-editor';
import { NOTICE_CATEGORIES } from './noticePolicies';
import { actionsButtons } from './newNoticePolicy';

const titles = {
  addToken: 'Add token',
  newTemplate: 'New patron notice template',
  templates: 'Patron notice templates',
};
const patronNoticeTemplatePaneContent = PaneContent({ id: 'patron-notice-template-pane-content' });
const patronNoticeForm = Form({ testId: 'patronNoticeForm' });
const saveButton = patronNoticeForm.find(Button('Save & close'));
const newButton = Button({ id: 'clickable-create-entry' });
const activeCheckbox = Checkbox({ id: 'input-patron-notice-active' });
const categorySelect = Select({ name: 'category' });
const actionsButton = Button('Actions');
const tokenButton = Button('{ }');
const addTokenButton = Button(titles.addToken);
const nameField = TextField({ id: 'input-patron-notice-name' });
const subjectField = TextField({ id: 'input-patron-notice-subject' });
const descriptionField = TextArea({ id: 'input-patron-notice-description' });
const bodyField = richTextEditor();
const previewModal = Modal({ id: 'preview-modal' });

const defaultUi = {
  name: `Test_template_${getRandomPostfix()}`,
  active: 'Yes',
  description: 'Template created by autotest team',
  subject: 'Subject_Test',
  body: 'Test_email_body',
};
export const createNoticeTemplate = ({
  name = 'autotest_template_name',
  category = NOTICE_CATEGORIES.loan,
  noticeOptions = {},
}) => {
  const templateName = `${name}-${getRandomPostfix()}`;
  return {
    name: templateName,
    category,
    description: 'Created by autotest team',
    subject: `autotest_template_subject_${getRandomPostfix()}`,
    body: 'Test email body {{item.title}} {{loan.dueDateTime}}',
    previewText: `Test email body The Wines of Italy ${moment().format('ll')}`,
    // notice option
    notice: {
      templateName,
      noticeName: category.name,
      noticeId: category.id,
      format: 'Email',
      action: 'Item aged to lost',
      ...noticeOptions,
    },
  };
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

  create(noticePolicyTemplate, autoSave = true) {
    // need to wait for validation to complete
    cy.wait(300);
    cy.do(nameField.fillIn(noticePolicyTemplate.name));
    cy.expect(nameField.has({ value: noticePolicyTemplate.name }));

    cy.do(descriptionField.fillIn(noticePolicyTemplate.description));
    cy.expect(descriptionField.has({ value: noticePolicyTemplate.description }));

    cy.do(subjectField.fillIn(noticePolicyTemplate.subject));
    cy.expect(subjectField.has({ value: noticePolicyTemplate.subject }));

    cy.do(bodyField.fillIn(noticePolicyTemplate.body));
    cy.expect(bodyField.has({ value: noticePolicyTemplate.body }));

    if (autoSave) {
      cy.do(saveButton.click());
    }
  },

  chooseCategory(category) {
    cy.do(categorySelect.choose(category));
  },

  checkPreview(message) {
    cy.do(patronNoticeTemplatePaneContent.find(Button('Preview')).click());
    cy.expect([
      previewModal.has({ header: 'Preview of patron notice template' }),
      previewModal.has({ message: including(message) }),
    ]);
    cy.do(previewModal.find(Button('Close')).click());
    cy.expect(previewModal.absent());
  },

  verifyMetadataObjectIsVisible: (creator = 'Unknown user') => {
    cy.expect([
      patronNoticeTemplatePaneContent.find(Accordion({ label: 'General information' })).exists(),
      patronNoticeTemplatePaneContent
        .find(Button('General information'))
        .has({ ariaExpanded: 'true' }),
    ]);
    cy.do(patronNoticeTemplatePaneContent.find(Button(including('Record last updated'))).click());
    cy.expect(
      patronNoticeTemplatePaneContent
        .find(MetaSection({ updatedByText: including(creator) }))
        .exists(),
    );
  },

  verifyGeneralInformationForDuplicate: (template) => {
    cy.expect([
      nameField.has({
        value: template.name,
        error: 'A patron notice with this name already exists',
      }),
      activeCheckbox.has({ checked: true }),
      descriptionField.has({ value: template.description }),
      categorySelect.has({ value: template.category }),
    ]);
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
    cy.expect(bodyField.has({ value: `{{${noticePolicyTemplateToken}}}` }));
    return cy.wrap(noticePolicyTemplateToken);
  },

  clearBody() {
    cy.do(RichEditor().fillIn(''));
  },

  saveAndClose() {
    cy.expect(saveButton.has({ disabled: false }));
    return cy.do(saveButton.click());
  },

  checkNewButton() {
    cy.expect([newButton.exists(), newButton.should('not.be.disabled')]);
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
      activeCheckbox.has({ checked: 'true' }),
      cy
        .get('select[name="category"]')
        .get('option')
        .each(($option, index) => {
          if (index <= 5) {
            expect($option).to.contain(Object.values(NOTICE_CATEGORIES)[index].name);
          }
        }),
    ]);
  },
  checkAfterSaving(noticePolicyTemplate) {
    const propertiesToCheck = {
      name: noticePolicyTemplate.name,
      description: noticePolicyTemplate.description,
      category: noticePolicyTemplate.category.requestId,
      subject: noticePolicyTemplate.subject,
      body: noticePolicyTemplate.body,
    };
    Object.values(propertiesToCheck).forEach((prop) => {
      cy.expect(
        Pane(propertiesToCheck.name)
          .find(KeyValue({ value: prop }))
          .exists(),
      );
    });
  },

  delete: () => {
    cy.do([
      actionsButton.click(),
      Button({ id: 'dropdown-clickable-delete-item' }).click(),
      Button({ id: 'clickable-delete-item-confirmation-confirm' }).click(),
    ]);
  },

  duplicateTemplate() {
    cy.do([actionsButton.click(), actionsButtons.duplicate.click()]);
  },

  editTemplate(name) {
    cy.do([NavListItem(name).click(), actionsButton.click(), actionsButtons.edit.click()]);
  },

  typeTemplateName(noticePolicytemplateName) {
    cy.do(nameField.fillIn(noticePolicytemplateName));
  },

  typeTemplateSubject(noticePolicytemplateSubject) {
    cy.do(subjectField.fillIn(noticePolicytemplateSubject));
  },

  createPatronNoticeTemplate(template, dublicate = false) {
    cy.intercept('GET', `/templates?query=(name==%22${template.name}%22)`, {
      statusCode: 201,
      body: {
        templates: [],
        totalRecords: 0,
      },
    });

    if (dublicate) {
      this.duplicateTemplate();
      this.typeTemplateName(template.name);
      this.typeTemplateSubject(template.subject);
    } else {
      this.startAdding();
      this.checkInitialState();
      this.addToken('item.title');
      this.create(template, false);
      this.chooseCategory(template.category.name);
    }

    this.checkPreview(template.previewText);
    this.saveAndClose();
    cy.expect(patronNoticeForm.absent());
  },
};
