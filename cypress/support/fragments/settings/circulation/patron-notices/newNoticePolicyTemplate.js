/* eslint-disable cypress/no-unnecessary-waiting */
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
  IconButton,
  Label,
  Popover,
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
const subjectInfoButton = Label(including('Subject')).find(IconButton({ icon: 'info' }));
const descriptionField = TextArea({ id: 'input-patron-notice-description' });
const bodyField = richTextEditor();
const bodyInfoButton = Label(including('Body')).find(IconButton({ icon: 'info' }));
const previewModal = Modal({ id: 'preview-modal' });
const addTokenModal = Modal({ header: titles.addToken });
const infoPopoverMessages = {
  noticeFormat:
    'If text message is selected, it has a maximum limit of 160 characters, including spaces, numbers, and symbols. If more than 160 characters are used, multiple text messages will be sent.',
  subject: 'To enable the Subject field, select Email in the Notice format drop-down list.',
  body: 'To enable the Body field, select an option in the Notice format drop-down list.',
};

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

  verifyNewButtonLabel() {
    const listPaneNewButton = Pane(titles.templates).find(newButton);
    cy.expect([listPaneNewButton.exists(), listPaneNewButton.has({ text: 'New', visible: true })]);
  },

  verifyNewTemplateForm() {
    cy.expect([
      Pane(titles.newTemplate).exists(),
      Heading(titles.newTemplate).exists(),
      Accordion('General information').exists(),
      Accordion('Patron notice content').exists(),
    ]);
  },

  verifyNoticeContentAccordionIsSecond() {
    cy.expect(Accordion('Patron notice content').has({ index: 1 }));
  },

  expandTemplateAccordion(label) {
    const accordion = Accordion(label);
    cy.expect(accordion.exists());
    cy.do(accordion.expand());
    cy.expect(accordion.has({ open: true }));
  },

  verifyGeneralInformationFields() {
    cy.expect([
      nameField.has({ required: true }),
      activeCheckbox.has({ checked: true }),
      descriptionField.exists(),
      categorySelect.exists(),
    ]);
  },

  verifyInitialNoticeContentFields() {
    cy.expect(subjectField.has({ disabled: true }));
    cy.expect(subjectInfoButton.exists());
    cy.get('[data-testid="patronNoticeAccordion"] .ql-editor').should(
      'have.attr',
      'contenteditable',
      'false',
    );
    cy.expect(bodyInfoButton.exists());
  },

  verifyBodyRequiredIndicator(visible = true) {
    cy.get(
      '[data-testid="patronNoticeAccordion"] label, [data-testid="patronNoticeAccordion"] div[class^="label-"]',
    )
      .filter((_, element) => element.textContent.trim().startsWith('Body'))
      .should(($labels) => {
        expect($labels, 'Body label').to.have.length(1);
        const label = $labels[0];
        const { defaultView } = label.ownerDocument;
        const pseudoContent = ['::before', '::after']
          .map((pseudo) => defaultView.getComputedStyle(label, pseudo).content)
          .join(' ');
        const requiredIndicator =
          label.textContent.includes('*') ||
          label.querySelector('[class*="required"]') ||
          label.parentElement?.querySelector('[class*="required"]') ||
          pseudoContent.includes('*');

        expect(Boolean(requiredIndicator), 'Body required indicator').to.equal(visible);
      });
  },

  verifyInitialNoticeFormatField() {
    cy.expect(noticeFormatField.exists());
    cy.expect(noticeFormatField.has({ required: true }));
    cy.expect(noticeFormatField.has({ selectedOptionLabel: 'Select notice format' }));
    cy.expect(noticeFormatField.has({ hasInfoButton: true }));
  },

  verifyPreviewButtonAboveBody() {
    const layout = {};
    cy.do(
      patronNoticeForm.perform((paneContent) => {
        const body = paneContent.querySelector('[class^="quill"][class*="editor"]');
        const preview = [...paneContent.querySelectorAll('button')].find(
          (button) => button.textContent.trim() === 'Preview',
        );
        // eslint-disable-next-line no-unused-expressions
        expect(body, 'Body editor').to.exist;
        // eslint-disable-next-line no-unused-expressions
        expect(preview, 'Preview button').to.exist;

        const bodyRect = body.getBoundingClientRect();
        const previewRect = preview.getBoundingClientRect();
        layout.bodyTop = bodyRect.top;
        layout.bodyLeft = bodyRect.left;
        layout.bodyWidth = bodyRect.width;
        layout.previewBottom = previewRect.bottom;
        layout.previewRight = previewRect.right;
      }),
    );
    cy.then(() => {
      expect(layout.previewBottom, 'Preview button is above Body').to.be.at.most(layout.bodyTop);
      expect(layout.previewRight, 'Preview button is on the right side of Body').to.be.greaterThan(
        layout.bodyLeft + layout.bodyWidth / 2,
      );
    });
  },

  verifyFormFooterButtons() {
    cy.expect([
      patronNoticeForm.find(Button('Cancel')).has({ disabled: false, visible: true }),
      saveButton.has({ visible: true }),
    ]);
  },

  verifyFormFooterButtonsBelowBody() {
    this.verifyFormFooterButtons();

    cy.get('[data-testid="patronNoticeForm"]').should(($form) => {
      const body = $form.find('[class^="quill"][class*="editor"]')[0];
      const buttons = [...$form.find('button')];
      const cancel = buttons.find((button) => button.textContent.trim() === 'Cancel');
      const save = buttons.find((button) => button.textContent.trim() === 'Save & close');
      // eslint-disable-next-line no-unused-expressions
      expect(body, 'Body editor').to.exist;
      // eslint-disable-next-line no-unused-expressions
      expect(cancel, 'Cancel button').to.exist;
      // eslint-disable-next-line no-unused-expressions
      expect(save, 'Save & close button').to.exist;

      const bodyBottom = body.getBoundingClientRect().bottom;
      expect(cancel.getBoundingClientRect().top, 'Cancel button is below Body').to.be.at.least(
        bodyBottom,
      );
      expect(save.getBoundingClientRect().top, 'Save & close button is below Body').to.be.at.least(
        bodyBottom,
      );
    });
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

  verifyNoticeFormatOptions() {
    cy.do(noticeFormatField.click());
    cy.expect(
      noticeFormatField.has({
        optionsText: ['Select notice format', 'Email', 'Print only', 'Text message'],
      }),
    );
  },

  verifySubjectEnabled() {
    cy.expect(subjectField.has({ disabled: false }));
  },

  verifySubjectDisabled() {
    cy.expect(subjectField.has({ disabled: true }));
  },

  verifyBodyRichTextEditorEnabled() {
    cy.get('[data-testid="patronNoticeAccordion"] .ql-editor').should(
      'have.attr',
      'contenteditable',
      'true',
    );
  },

  verifyBodyTextAreaEnabled() {
    cy.get('[data-testid="patronNoticeAccordion"] textarea[id^="rte-"]').should('not.be.disabled');
  },

  verifyBodyDisabled() {
    cy.get('[data-testid="patronNoticeAccordion"] .ql-editor').should(
      'have.attr',
      'contenteditable',
      'false',
    );
  },

  fillSubjectAndBody({ subject, body }) {
    cy.do(subjectField.fillIn(subject));
    cy.expect(subjectField.has({ value: subject }));
    cy.get('[data-testid="patronNoticeAccordion"] .ql-editor').clear().type(body);
    cy.expect(bodyField.has({ value: body }));
  },

  clickNoticeFormatInfoButton() {
    cy.do(noticeFormatField.clickInfoButton());
  },

  clickSubjectInfoButton() {
    cy.do(subjectInfoButton.click());
  },

  clickBodyInfoButton() {
    cy.do(bodyInfoButton.click());
  },

  verifyInfoPopover(message) {
    cy.expect(Popover({ content: including(message) }).exists());
  },

  getInfoPopoverMessage(name) {
    return infoPopoverMessages[name];
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

  openTemplateByName(name) {
    cy.expect(Link(name).exists());
    cy.do(Link(name).click());
    cy.expect(Pane(name).exists());
  },

  verifyTemplateInListAndDetail(name) {
    cy.expect([Link(name).exists(), Pane(name).exists()]);
  },

  verifySavedTemplateDetails({ name, noticeFormat, subject, body }) {
    this.editTemplate(name);
    cy.expect([
      nameField.has({ value: name }),
      noticeFormatField.has({ selectedOptionLabel: noticeFormat }),
      subjectField.has({ value: subject }),
      bodyField.has({ value: body }),
    ]);
    cy.do(patronNoticeForm.find(Button('Cancel')).click());
    cy.expect(Pane(name).exists());
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
