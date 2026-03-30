import { including } from '@interactors/html';
import {
  Accordion,
  DropdownMenu,
  PaneHeader,
  MultiColumnListCell,
  KeyValue,
  Button,
  TextField,
  TextArea,
  Checkbox,
  HTML,
  MetaSection,
  Modal,
  Select,
} from '../../../../../interactors';

const actionsButton = Button('Actions');
const editButton = Button('Edit');
const duplicateButton = Button('Duplicate');
const deleteButton = Button('Delete');
const nameTextfield = TextField('Name*');
const descriptionTextarea = TextArea('Description');
const saveAndCloseButton = Button('Save & close');
const closeButton = Button({ icon: 'times' });
const cancelButton = Button('Cancel');
const cannotDeleteModal = Modal('Cannot delete mapping profile');
const deleteMappingProfileModal = Modal('Delete mapping profile');

export default {
  clickProfileNameFromTheList(name) {
    cy.wait(2000);
    // Scroll in case the list of results is long
    const scrollableSelector = '#search-results-list [class^=mclScrollable]';

    cy.get(scrollableSelector).then(($element) => {
      // Check if the element is scrollable
      const hasVerticalScrollbar = $element.get(0).scrollHeight > $element.get(0).clientHeight;

      if (hasVerticalScrollbar) {
        cy.get(scrollableSelector).scrollTo('bottom');
      }
    });
    cy.do(MultiColumnListCell(including(name)).click());
  },

  waitLoading(name) {
    cy.expect(PaneHeader(name).exists());
  },

  verifyProfileDetails(profileDetails) {
    cy.expect([
      KeyValue('Name').has({ value: profileDetails.name }),
      KeyValue('FOLIO record type').has({ value: profileDetails.recordType }),
      KeyValue('Output format').has({ value: profileDetails.outputFormat }),
      KeyValue('Description').has({ value: profileDetails.description }),
      Accordion({ headline: 'Update information' }).has({
        content: including(`Source: ${profileDetails.source}`),
      }),
    ]);
    if (Object.prototype.hasOwnProperty.call(profileDetails, 'fieldsSuppression')) {
      cy.expect(KeyValue('Fields suppression').has({ value: profileDetails.fieldsSuppression }));
    }

    if (Object.prototype.hasOwnProperty.call(profileDetails, 'transformation')) {
      cy.expect(HTML('No transformations found').absent());
    }
  },

  verifyLockProfileCheckbox(isChecked, isDisabled) {
    cy.expect(Checkbox('Lock profile').has({ checked: isChecked, disabled: isDisabled }));
  },

  verifyNoTransformationsMessage() {
    cy.expect(Accordion('Transformations').find(HTML('No transformations found')).exists());
  },

  verifyCheckboxChecked(name) {
    cy.expect(Checkbox(name).has({ checked: true }));
  },

  verifyCheckboxNotChecked(name, isDisabled = false) {
    cy.expect(Checkbox(name).has({ checked: false, disabled: isDisabled }));
  },

  verifyOutputFormatValue(format) {
    cy.expect(Select('Output format*').has({ checkedOptionText: format }));
  },

  verifyFieldsSuppressionTextAreaValue(value) {
    cy.expect(TextArea('Fields suppression').has({ value }));
  },

  verifyElements() {
    cy.expect([
      Accordion({ label: 'Summary', open: true }).exists(),
      Accordion({ label: 'Transformations', open: true }).exists(),
      Button('Collapse all').has({ disabled: false }),
      Button({ icon: 'times' }).has({ disabled: false }),
      actionsButton.has({ disabled: false }),
      Button({ ariaLabel: 'Cancel' }).has({ disabled: false }),
    ]);
  },

  verifyOnlyDuplicateOptionAvailable() {
    this.openActions();
    cy.expect([
      editButton.absent(),
      duplicateButton.has({ disabled: false }),
      deleteButton.absent(),
    ]);
  },

  verifyActionOptions() {
    this.openActions();
    cy.expect([
      editButton.has({ disabled: false }),
      duplicateButton.has({ disabled: false }),
      deleteButton.has({ disabled: false }),
    ]);
  },

  verifyActionsMenuItems(config = { edit: true, duplicate: true, delete: true }) {
    const assertions = [];

    if (config.edit) assertions.push(DropdownMenu().find(editButton).exists());
    else assertions.push(DropdownMenu().find(editButton).absent());

    if (config.duplicate) assertions.push(DropdownMenu().find(duplicateButton).exists());
    else assertions.push(DropdownMenu().find(duplicateButton).absent());

    if (config.delete) assertions.push(DropdownMenu().find(deleteButton).exists());
    else assertions.push(DropdownMenu().find(deleteButton).absent());

    cy.expect(assertions);
  },

  editFieldMappingProfile(newName, newDescription) {
    // Need to wait for page to reload
    cy.wait(2000);
    cy.do([
      nameTextfield.clear(),
      nameTextfield.fillIn(newName),
      descriptionTextarea.fillIn(newDescription),
    ]);
  },

  verifyNameTextField(name) {
    cy.expect(nameTextfield.has({ value: name }));
  },

  verifyDescriptionTextArea(description) {
    cy.expect(descriptionTextarea.has({ value: description }));
  },

  verifyMetadataSectionExists() {
    cy.expect(
      Accordion('Summary')
        .find(MetaSection({ open: false }))
        .exists(),
    );
  },

  duplicateFieldMappingProfile() {
    cy.do([duplicateButton.click(), saveAndCloseButton.click()]);
  },

  verifySaveAndCloseButtonDisabled(isDisabled = true) {
    cy.expect(saveAndCloseButton.has({ disabled: isDisabled }));
  },

  verifyCloseButtonDisabled(isDisabled = true) {
    cy.expect(closeButton.has({ disabled: isDisabled }));
  },

  clickCloseButton() {
    cy.do(closeButton.click());
  },

  clickEditTransformations() {
    cy.do(Accordion('Transformations').find(Button('Edit transformations')).click());
  },

  checkRecordType(recordType) {
    cy.do(Checkbox(recordType).click());
  },

  openActions() {
    cy.do(actionsButton.click());
  },

  clickEditButton() {
    cy.do(editButton.click());
    cy.wait(2000);
  },

  clickDuplicateButton() {
    cy.do(duplicateButton.click());
  },

  clickDeleteButton() {
    cy.do(deleteButton.click());
  },

  confirmDeletion() {
    cy.do(Modal().find(deleteButton).click());
  },

  clickCancelButton() {
    cy.do(cancelButton.click());
  },

  clickCloseWithoutSavingButton() {
    cy.do(Modal('Are you sure?').find(Button('Close without saving')).click());
  },

  verifyCancelButtonDisabled(isDisabled = true) {
    cy.expect(cancelButton.has({ disabled: isDisabled }));
  },

  verifyActionsButtonAbsent() {
    cy.expect(actionsButton.absent());
  },

  clickXButton() {
    cy.do(Button({ icon: 'times' }).click());
  },

  verifyDeleteMappingProfileModal(mappingProfileName) {
    const message = `The mapping profile ${mappingProfileName} will be deleted.`;

    cy.expect([
      deleteMappingProfileModal.exists(),
      deleteMappingProfileModal.has({ message: including(message) }),
      deleteMappingProfileModal.find(cancelButton).has({ disabled: false }),
      deleteMappingProfileModal.find(Button('Delete')).has({ disabled: false, focused: true }),
    ]);
  },

  verifyDeleteMappingProfileModalClosed() {
    cy.expect(deleteMappingProfileModal.absent());
  },

  verifyCannotDeleteModalOpened() {
    cy.expect(cannotDeleteModal.exists());
    cy.expect(cannotDeleteModal.has({ header: 'Cannot delete mapping profile' }));
  },

  verifyCannotDeleteModalMessage(jobProfileNames, excludedJobProfileNames = []) {
    const expectedMessage =
      'This mapping profile cannot be deleted, as it is used in the following job profiles';

    cy.expect(cannotDeleteModal.has({ message: including(expectedMessage) }));

    jobProfileNames.forEach((name) => {
      cy.expect(cannotDeleteModal.has({ message: including(name) }));
    });

    excludedJobProfileNames.forEach((name) => {
      cy.expect(cannotDeleteModal.find(HTML({ text: including(name) })).absent());
    });
  },

  closeCannotDeleteModal() {
    cy.do(cannotDeleteModal.find(Button('Close')).click());
  },

  verifyCannotDeleteModalClosed() {
    cy.expect(cannotDeleteModal.absent());
  },
};
