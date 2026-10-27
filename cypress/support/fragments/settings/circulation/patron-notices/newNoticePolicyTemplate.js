/* eslint-disable cypress/no-unnecessary-waiting */
import {
  Accordion,
  Button,
  Checkbox,
  Form,
  Heading,
  including,
  KeyValue,
  Link,
  MetaSection,
  Modal,
  NavListItem,
  Pane,
  PaneContent,
  RichEditor2,
  Select,
  TextArea,
  TextField,
} from '../../../../../../interactors';
import getRandomPostfix from '../../../../utils/stringTools';
import { actionsButtons } from './newNoticePolicy';
import { NOTICE_CATEGORIES } from './noticePolicies';

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
const noticeFormatField = Select({ label: 'Notice format*' });
const tokenCategorySelector = '[data-testid="tokenListWrapper"] [class^="col-xs-12"]';
const tokenCategoryQuery = (category) => {
  return cy.get(tokenCategorySelector).filter((_, element) => {
    return element.querySelector('[class^="categoryHeader"]')?.textContent.trim() === category;
  });
};
const actionsButton = Button('Actions');
const tokenButton = Button('{ }');
const addTokenButton = Button(titles.addToken);
const nameField = TextField({ id: 'input-patron-notice-name' });
const subjectField = TextField({ id: 'input-patron-notice-subject' });
const descriptionField = TextArea({ id: 'input-patron-notice-description' });
const bodyField = RichEditor2();
const previewModal = Modal({ id: 'preview-modal' });
const addTokenModal = Modal({ header: titles.addToken });

export const createNoticeTemplate = ({
  name = 'autotest_template_name',
  category = NOTICE_CATEGORIES.loan,
  noticeOptions = {},
  noticeFormat = 'Email',
}) => {
  const templateName = `${name}-${getRandomPostfix()}`;
  return {
    name: templateName,
    category,
    description: 'Created by autotest team',
    noticeFormat,
    subject: `autotest_template_subject_${getRandomPostfix()}`,
    body: 'Test email body {{item.title}} {{loan.dueDateTime}}',
    previewText: 'Test email body The Wines of Italy',
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
  getDefaultUI() {
    return {
      name: `Test_template_${getRandomPostfix()}`,
      active: 'Yes',
      description: 'Template created by autotest team',
      subject: 'Subject_Test',
      body: 'Test_email_body',
      noticeFormat: 'Email',
    };
  },

  waitLoading() {
    cy.expect(Link(titles.templates).exists());
    cy.do(Link(titles.templates).click());
    cy.expect(Heading(titles.templates).exists());
  },

  verifyTemplatesListPane() {
    cy.expect(Heading(titles.templates).exists());
  },

  verifyNewTemplateForm() {
    cy.expect([
      Pane(titles.newTemplate).exists(),
      Heading(titles.newTemplate).exists(),
      Accordion('General information').exists(),
      Accordion('Patron notice content').exists(),
    ]);
  },

  expandTemplateAccordion(label) {
    const accordion = Accordion(label);
    cy.expect(accordion.exists());
    cy.do(accordion.expand());
    cy.expect(accordion.has({ open: true }));
  },

  selectTemplateCategory(category) {
    cy.do(categorySelect.choose(category));
    cy.expect(categorySelect.has({ selectedOptionLabel: category }));
  },

  fillTemplateName(name) {
    cy.do(nameField.fillIn(name));
    cy.expect(nameField.has({ value: name }));
  },

  selectNoticeFormat(format) {
    cy.do(noticeFormatField.choose(format));
    cy.expect(noticeFormatField.has({ selectedOptionLabel: format }));
  },

  openAddTokenModal() {
    cy.do(tokenButton.click());
    cy.expect(addTokenModal.exists());
  },

  verifyTokenCategory(category) {
    tokenCategoryQuery(category)
      .should('have.length', 1)
      .find('ul[data-test-available-tokens]')
      .should('exist');
  },

  verifyItemTokenOrder() {
    tokenCategoryQuery('Item')
      .find('ul[data-test-available-tokens]')
      .should(($tokenList) => {
        const tokenNames = [...$tokenList.find('input[type="checkbox"]')].map(
          (input) => input.value,
        );
        const titleIndex = tokenNames.indexOf('item.title');
        const titleShortIndex = tokenNames.indexOf('item.titleShort');
        const primaryContributorIndex = tokenNames.indexOf('item.primaryContributor');

        expect(titleIndex, 'item.title token').to.be.at.least(0);
        expect(titleShortIndex, 'item.titleShort token').to.be.greaterThan(titleIndex);
        expect(primaryContributorIndex, 'item.primaryContributor token').to.be.greaterThan(
          titleShortIndex,
        );
      });
  },

  closeAddTokenModal() {
    cy.do(addTokenModal.find(Button('Cancel')).click());
    cy.expect(addTokenModal.absent());
  },

  addTokenFromCategory(tokenName, category) {
    this.openAddTokenModal();
    this.verifyTokenCategory(category);
    const tokenCheckbox = addTokenModal.find(Checkbox(tokenName));
    cy.expect(tokenCheckbox.exists());
    cy.do(tokenCheckbox.click());
    cy.expect(tokenCheckbox.has({ checked: true }));
    cy.expect(addTokenButton.has({ disabled: false }));
    cy.do(addTokenButton.click());
    cy.expect(addTokenModal.absent());
    cy.expect(bodyField.has({ value: including(`{{${tokenName}}}`) }));
  },

  checkPreviewIncludes(values) {
    cy.do(patronNoticeTemplatePaneContent.find(Button('Preview')).click());
    cy.expect(previewModal.has({ header: 'Preview of patron notice template' }));
    values.forEach((value) => {
      cy.expect(previewModal.has({ message: including(value) }));
    });
    cy.do(previewModal.find(Button('Close')).click());
    cy.expect(previewModal.absent());
  },

  openToSide(noticePolicyTemplate) {
    return cy.do(Link(noticePolicyTemplate.name).click());
  },

  verifyNoticePolicyTemplate(noticePolicyTemplate) {
    this.verifyKeyValue('Patron notice template name', noticePolicyTemplate.name);
    this.verifyKeyValue('Description', noticePolicyTemplate.description);
    this.verifyKeyValue('Subject', noticePolicyTemplate.subject);
    this.verifyKeyValue('Body', noticePolicyTemplate.body);
  },

  updateBodyText(text) {
    cy.wait(1000);
    cy.do(bodyField.fillIn(text));
    cy.expect(bodyField.has({ value: text }));
    cy.do(this.saveAndClose());
  },

  verifyRequestPolicyInNotInTheList(name) {
    cy.contains(name).should('not.exist');
  },

  verifyKeyValue(verifyKey, verifyValue) {
    cy.expect(KeyValue(verifyKey, { value: verifyValue }).exists());
  },

  create(noticePolicyTemplate, autoSave = true) {
    // need to wait for validation to complete
    cy.wait(1000);
    cy.do(nameField.fillIn(noticePolicyTemplate.name));
    cy.expect(nameField.has({ value: noticePolicyTemplate.name }));
    cy.wait(2000);

    cy.do(descriptionField.fillIn(noticePolicyTemplate.description));
    cy.expect(descriptionField.has({ value: noticePolicyTemplate.description }));

    cy.do(noticeFormatField.choose(noticePolicyTemplate.noticeFormat));

    cy.expect(subjectField.has({ disabled: false }));
    cy.do(subjectField.fillIn(noticePolicyTemplate.subject));
    cy.expect(subjectField.has({ value: noticePolicyTemplate.subject }));

    cy.do(bodyField.fillIn(noticePolicyTemplate.body));
    cy.expect(bodyField.has({ value: noticePolicyTemplate.body }));

    cy.wait(1000);
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

  verifyMetadataObjectIsVisible({ creator = 'Unknown user', paneTitle = titles.newTemplate } = {}) {
    cy.expect(Accordion({ label: 'General information' }).exists());
    cy.expect(Button('General information').has({ ariaExpanded: 'true' }));
    cy.do(Pane(paneTitle).find(MetaSection()).clickHeader());
    cy.expect(
      Pane(paneTitle)
        .find(MetaSection({ updatedByText: including(creator) }))
        .exists(),
    );
  },

  verifyGeneralInformationForDuplicate: (template) => {
    cy.expect(nameField.has({ focused: true }));
    cy.do(nameField.blur());
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
    tokenButton.exists();
    cy.do(tokenButton.click());
    cy.expect(Modal({ header: 'Add token' }).exists());
    cy.expect(Heading(titles.addToken).exists());
    cy.expect(Checkbox(`${noticePolicyTemplateToken}`).exists());
    cy.do(Checkbox(`${noticePolicyTemplateToken}`).click());
    cy.expect(Checkbox(`${noticePolicyTemplateToken}`).has({ checked: true }));
    cy.expect(addTokenButton.has({ disabled: false }));
    cy.do(addTokenButton.click());
    cy.expect(Modal({ header: 'Add token' }).absent());
    cy.expect(bodyField.has({ value: `{{${noticePolicyTemplateToken}}}` }));
    return cy.wrap(noticePolicyTemplateToken);
  },

  clearBody() {
    cy.do(RichEditor2().fillIn(''));
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
      noticeFormat: noticePolicyTemplate.noticeFormat || 'Email',
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

  checkSubjectEmptyError() {
    cy.do(nameField.fillIn('Test'));
    cy.expect(nameField.has({ value: 'Test' }));

    cy.do(descriptionField.fillIn('Test'));
    cy.expect(descriptionField.has({ value: 'Test' }));

    cy.do(noticeFormatField.choose('Email'));

    cy.expect(subjectField.has({ disabled: false }));
    cy.do(subjectField.fillIn(''));
    cy.wait(1000);
    cy.do(bodyField.fillIn('Test'));
    cy.wait(1000);
    cy.get('*[id=icon-input-patron-notice-subject-validation-error]').should('exist');

    cy.do([Button('Cancel').click(), Button('Close without saving').click()]);
  },

  checkRichTextEditor() {
    cy.wait(1000);
    cy.do(nameField.fillIn('Test'));
    cy.expect(nameField.has({ value: 'Test' }));

    cy.do(noticeFormatField.choose('Email'));

    cy.expect(subjectField.has({ disabled: false }));
    cy.do(descriptionField.fillIn('Test'));
    cy.expect(descriptionField.has({ value: 'Test' }));

    cy.do(subjectField.fillIn('Test'));
    cy.expect(subjectField.has({ value: 'Test' }));

    cy.do(bodyField.fillIn('Preview Test'));
    cy.get('button[aria-label="ordered list"]').click();

    cy.do([
      cy.get('button[aria-label="increase indent"]').click(),
      cy.get('button[aria-label="increase indent"]').click(),
    ]);

    cy.get('li[style="text-indent: 2em;"]').should('exist');
    cy.get('div[class^="preview"] button').click();
    cy.expect([
      previewModal.has({ header: 'Preview of patron notice template' }),
      previewModal.has({ message: including('Preview Test') }),
    ]);
    cy.do(previewModal.find(Button('Close')).click());
    cy.expect(previewModal.absent());
  },

  createPatronNoticeTemplate(template, duplicate = false) {
    if (duplicate) {
      this.duplicateTemplate();
      this.typeTemplateName(template.name);
      this.typeTemplateSubject(template.subject);
    } else {
      this.startAdding();
      this.checkInitialState();
      this.create(template, false);
      this.chooseCategory(template.category.name);
    }

    cy.wait(2000);
    this.checkPreview(template.previewText);
    cy.wait(2000);
    this.saveAndClose();
    cy.wait(4000);
    cy.expect(patronNoticeForm.absent());
  },

  getNoticePolicyTemplatesByNameViaAPI() {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'templates',
      })
      .then((response) => {
        return response.body.templates;
      });
  },

  deleteNoticePolicyTemplateByNameViaAPI(name) {
    return this.getNoticePolicyTemplatesByNameViaAPI().then((policies) => {
      const policy = policies.find((p) => p.name === name);
      if (policy !== undefined) {
        return this.deleteViaAPI(policy.id);
      }
      return undefined;
    });
  },

  deleteViaAPI(id) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `templates/${id}`,
    });
  },
};
