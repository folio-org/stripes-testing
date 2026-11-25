/* eslint-disable cypress/no-unnecessary-waiting */
import {
  Accordion,
  Button,
  Checkbox,
  DropdownMenu,
  Form,
  Heading,
  HTML,
  IconButton,
  including,
  KeyValue,
  Label,
  Link,
  MetaSection,
  Modal,
  NavListItem,
  not,
  or,
  Pane,
  PaneContent,
  Popover,
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
const previewButton = patronNoticeTemplatePaneContent.find(Button('Preview'));
// The Body label belongs to the template editor, which is the only control labelled for "editor"
const bodyLabel = Label({ for: 'editor' });
const infoIconButton = IconButton({ icon: 'info' });
const infoTriggers = {
  'Notice format': noticeFormatField.find(infoIconButton),
  Subject: subjectField.find(infoIconButton),
  Body: bodyLabel.find(infoIconButton),
};
const formFooter = HTML({ className: including('paneFooter') });
// The detail view of the open template has the same accordions, so they are looked up in the form
const patronNoticeContentAccordion = patronNoticeForm.find(Accordion('Patron notice content'));
// A Text message Body is a plain text area without a toolbar
const plainBodyField = patronNoticeContentAccordion.find(TextArea());
const editorToolbar = patronNoticeContentAccordion.find(
  HTML({ className: including('ql-formats') }),
);
const formCancelButton = formFooter.find(Button({ id: 'footer-cancel-entity' }));
const areYouSureModal = Modal('Are you sure?');

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
    const accordion = patronNoticeForm.find(Accordion(label));
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

  verifyNewButtonLabel() {
    cy.expect(newButton.has({ text: 'New' }));
  },

  verifyGeneralInformationFields() {
    const generalInformation = Accordion('General information');
    cy.expect([
      generalInformation.find(nameField).has({ required: true }),
      generalInformation.find(activeCheckbox).has({ checked: true }),
      generalInformation.find(descriptionField).exists(),
      generalInformation.find(categorySelect).exists(),
    ]);
  },

  verifyAccordionOrder(labels) {
    cy.get('#patron-notice-template-pane [class^=labelArea-]').should(($labelAreas) => {
      const accordionLabels = [...$labelAreas]
        .map((labelArea) => labelArea.textContent.trim())
        .filter((label) => labels.includes(label));
      expect(accordionLabels).to.deep.equal(labels);
    });
  },

  verifyNoticeFormatField({ selectedOption }) {
    cy.expect([
      noticeFormatField.has({ required: true }),
      noticeFormatField.has({ checkedOptionText: selectedOption }),
      noticeFormatField.has({ hasInfoButton: true }),
    ]);
  },

  verifySubjectField({ disabled }) {
    cy.expect([subjectField.has({ disabled }), subjectField.find(infoIconButton).exists()]);
  },

  // Quill marks a read-only editor with the ql-disabled class
  verifyBodyField({ disabled, required }) {
    cy.expect([
      bodyField
        .find(HTML({ className: including('ql-disabled') }))
        [disabled ? 'exists' : 'absent'](),
      bodyLabel.find(HTML('*'))[required ? 'exists' : 'absent'](),
      bodyLabel.find(infoIconButton).exists(),
    ]);
  },

  verifyPreviewButtonAboveRightSideOfBody({ disabled = false } = {}) {
    cy.expect(previewButton.has({ disabled }));
    cy.get('#patron-notice-template-pane-content').within(() => {
      cy.contains('button', 'Preview').then(([button]) => {
        // The editor toolbar is part of the Body text box
        cy.get('[class*="editor---"]').then(([editor]) => {
          const buttonRect = button.getBoundingClientRect();
          const bodyRect = editor.parentElement.getBoundingClientRect();
          expect(buttonRect.bottom, 'Preview is above the Body').to.be.at.most(bodyRect.top + 1);
          expect(buttonRect.left, 'Preview is on the right side of the Body').to.be.greaterThan(
            bodyRect.left + bodyRect.width / 2,
          );
        });
      });
    });
  },

  verifyFormFooterButtons() {
    cy.expect([
      formFooter.find(Button({ id: 'footer-cancel-entity' })).has({ disabled: false }),
      formFooter.find(Button({ id: 'footer-save-entity', disabled: or(true, false) })).exists(),
    ]);
  },

  verifyInfoPopover(fieldLabel, text) {
    const trigger = infoTriggers[fieldLabel];
    const popover = Popover({ content: including(text) });

    cy.expect(trigger.exists());
    cy.do(trigger.click());
    cy.expect(popover.exists());
    cy.do(trigger.click());
    cy.expect(popover.absent());
  },

  // Text is typed and tokens are added with the "{ }" button, as a user does. Setting the editor HTML
  // does not update the form value, and typing "{{" moves the cursor.
  typeInBody(text) {
    cy.expect(bodyField.find(HTML({ className: including('ql-disabled') })).absent());
    // Typing without a delay keeps the editor from re-rendering, and moving the cursor, between keys
    cy.get('#patron-notice-template-pane-content .ql-editor').type(text, { delay: 0 });
  },

  fillBody(parts) {
    parts.forEach((part) => {
      if (typeof part === 'string') this.typeInBody(part);
      else this.addTokenFromCategory(part.token, part.category);
    });
  },

  verifyBodyValue(text) {
    cy.expect(bodyField.has({ value: text }));
  },

  openPreview() {
    cy.expect(previewButton.has({ disabled: false }));
    cy.do(previewButton.click());
    cy.expect(previewModal.has({ header: 'Preview of patron notice template' }));
  },

  verifyPreviewContent({ includes = [], excludes = [] }) {
    includes.forEach((value) => cy.expect(previewModal.has({ message: including(value) })));
    excludes.forEach((value) => cy.expect(previewModal.has({ message: not(including(value)) })));
  },

  closePreview() {
    cy.do(previewModal.find(Button('Close')).click());
    cy.expect(previewModal.absent());
  },

  verifyNoticeFormatOptions(options) {
    cy.expect(noticeFormatField.has({ optionsText: options }));
  },

  verifyBodyEditor({ plainText }) {
    if (plainText) {
      cy.expect([plainBodyField.exists(), bodyField.absent(), editorToolbar.absent()]);
    } else {
      cy.expect([bodyField.exists(), editorToolbar.exists(), plainBodyField.absent()]);
      this.verifyBodyField({ disabled: false, required: true });
    }
  },

  verifySubjectValue(subject) {
    cy.expect(subjectField.has({ value: subject }));
  },

  fillPlainBody(text) {
    cy.do(plainBodyField.fillIn(text));
    cy.expect(plainBodyField.has({ value: text }));
  },

  verifyPlainBodyValue(value) {
    cy.expect(plainBodyField.has({ value }));
  },

  verifyBodyError(error) {
    cy.expect(patronNoticeContentAccordion.find(HTML(error)).exists());
  },

  focusAndLeaveTemplateName() {
    cy.do(nameField.focus());
    cy.do(nameField.blur());
  },

  verifyTemplateNameValue(name) {
    cy.expect(nameField.has({ value: name }));
  },

  verifyTemplateNameError(error) {
    cy.expect(nameField.has({ error }));
  },

  fillDescription(description) {
    cy.do(descriptionField.fillIn(description));
    cy.expect(descriptionField.has({ value: description }));
  },

  verifyFormIsOpened() {
    cy.expect(patronNoticeForm.exists());
  },

  verifyFormIsClosed() {
    cy.expect(patronNoticeForm.absent());
  },

  // Adds the tokens in one "Add token" modal. They are inserted in the order of their categories.
  addTokens(tokenNames) {
    this.openAddTokenModal();
    tokenNames.forEach((tokenName) => {
      const tokenCheckbox = addTokenModal.find(Checkbox(tokenName));
      cy.expect(tokenCheckbox.exists());
      cy.do(tokenCheckbox.click());
      cy.expect(tokenCheckbox.has({ checked: true }));
    });
    cy.do(addTokenButton.click());
    cy.expect(addTokenModal.absent());
  },

  cancelForm() {
    cy.do(formCancelButton.click());
  },

  verifyUnsavedChangesModal() {
    cy.expect([
      areYouSureModal.find(HTML(including('There are unsaved changes'))).exists(),
      areYouSureModal.find(Button('Close without saving')).exists(),
      areYouSureModal.find(Button('Keep editing')).exists(),
    ]);
  },

  verifyUnsavedChangesModalAbsent() {
    cy.expect(areYouSureModal.absent());
  },

  keepEditing() {
    cy.do(areYouSureModal.find(Button('Keep editing')).click());
    cy.expect(areYouSureModal.absent());
    cy.expect(patronNoticeForm.exists());
  },

  closeWithoutSaving() {
    cy.do(areYouSureModal.find(Button('Close without saving')).click());
    cy.expect(areYouSureModal.absent());
    cy.expect(patronNoticeForm.absent());
  },

  verifyTemplateInList(name, isPresent = true) {
    cy.expect(NavListItem(name)[isPresent ? 'exists' : 'absent']());
  },

  openTemplate(name) {
    cy.expect(NavListItem(name).exists());
    cy.do(NavListItem(name).click());
    cy.expect(Pane(name).exists());
  },

  // Subject is shown only for Email templates; pass null to check that it is not shown
  verifyTemplateDetails(name, { noticeFormat, subject, body, description }) {
    const detailsPane = Pane(name);

    cy.expect(detailsPane.exists());
    if (noticeFormat) {
      cy.expect(detailsPane.find(KeyValue('Notice format')).has({ value: noticeFormat }));
    }
    if (subject === null) cy.expect(detailsPane.find(KeyValue('Subject')).absent());
    else if (subject) cy.expect(detailsPane.find(KeyValue('Subject')).has({ value: subject }));
    if (body) cy.expect(detailsPane.find(KeyValue('Body')).has({ value: body }));
    if (description) {
      cy.expect(detailsPane.find(KeyValue('Description')).has({ value: description }));
    }
  },

  verifyTemplateDetailsPreviewButton(name) {
    cy.expect(Pane(name).find(Button('Preview')).has({ disabled: false }));
  },

  openTemplateEditForm(name) {
    const detailsPane = Pane(name);
    const editButton = DropdownMenu().find(actionsButtons.edit);

    cy.expect(detailsPane.find(actionsButton).exists());
    cy.do(detailsPane.find(actionsButton).click());
    cy.expect(editButton.exists());
    cy.do(editButton.click());
    cy.expect([patronNoticeForm.exists(), nameField.has({ value: name })]);
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
