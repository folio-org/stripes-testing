import {
  Button,
  ConfirmationModal,
  Dropdown,
  DropdownMenu,
  Form,
  HTML,
  Section,
  Select,
  SelectionList,
  SelectionOption,
  TextArea,
  TextField,
  including,
  matching,
} from '../../../../../../interactors';
import InteractorsTools from '../../../../utils/interactorsTools';
import Notifications from '../notifications';

const matchProfileForm = Form({ id: 'match-profiles-form' });
const summarySection = matchProfileForm.find(Section({ id: 'summary' }));
const detailsSection = matchProfileForm.find(Section({ id: 'match-profile-details' }));

const closeButton = matchProfileForm.find(Button('Close'));
const saveAndCloseButton = matchProfileForm.find(Button('Save as profile & Close'));

const selectActionProfile = Select({ name: 'profile.action' });
const criterionValueTypeSelectionList = SelectionList({ id: 'sl-container-criterion-value-type' });

const summarySectionFields = {
  name: summarySection.find(TextField({ name: 'profile.name' })),
  description: summarySection.find(TextArea({ name: 'profile.description' })),
};
const detailsSectionFields = {
  action: detailsSection.find(Select({ name: 'profile.action' })),
  recordType: detailsSection.find(Select({ name: 'profile.folioRecord' })),
  recordSelectorDropdown: detailsSection.find(Dropdown({ id: 'record-selector-dropdown' })),
};
const formButtons = {
  Close: closeButton,
  'Save as profile & Close': saveAndCloseButton,
};

export default {
  waitLoading() {
    cy.expect(matchProfileForm.exists());
  },
  verifyFormView() {
    cy.expect([
      summarySection.exists(),
      detailsSection.exists(),
      closeButton.has({ visible: true, disabled: false }),
      saveAndCloseButton.has({ visible: true, disabled: true }),
    ]);
  },
  checkButtonsConditions(buttons = []) {
    buttons.forEach(({ label, conditions }) => {
      cy.expect(formButtons[label].has(conditions));
    });
  },
  fillMatchProfileFields({ summary, details }) {
    if (summary) {
      this.fillSummaryProfileFields(summary);
    }
    if (details) {
      this.fillDetailsProfileFields(details);
    }
  },
  fillSummaryProfileFields({ name }) {
    if (name) {
      cy.do([summarySectionFields.name.focus(), summarySectionFields.name.fillIn(`"${name}"`)]);
      cy.expect(summarySectionFields.name.has({ value: `"${name}"` }));
    }
  },
  fillDetailsProfileFields({ action, recordType }) {
    if (action) {
      cy.do([
        detailsSectionFields.action.focus(),
        detailsSectionFields.action.choose(including(action)),
      ]);
    }
    if (recordType) {
      cy.do([
        detailsSectionFields.recordType.focus(),
        detailsSectionFields.recordType.choose(recordType),
      ]);
    }
  },
  verifyScreenName(profileName) {
    cy.expect(Form(including(`Edit ${profileName}`)).exists());
  },
  selectExistingRecordType(existingRecordType) {
    cy.do(detailsSection.find(Button({ dataId: existingRecordType })).click());
  },
  selectIncomingRecordType(incomingRecordType) {
    cy.do(detailsSectionFields.recordSelectorDropdown.choose(incomingRecordType));
  },
  changeExistingInstanceRecordField() {
    cy.do(Button({ id: 'criterion-value-type' }).click());
    cy.wait(1500);
    cy.expect(criterionValueTypeSelectionList.exists());
    cy.do(
      criterionValueTypeSelectionList.find(SelectionOption('Admin data: Instance UUID')).click(),
    );
    // need to wait until value will be selected
    cy.wait(1000);
  },
  changesNotSaved() {
    cy.expect(TextField({ name: 'profile.name' }).exists());
    cy.expect(selectActionProfile.exists());
  },
  verifyIncomingRecordsDropdown(...names) {
    cy.do(Dropdown({ id: 'record-selector-dropdown' }).toggle());
    names.forEach((name) => {
      cy.expect([DropdownMenu({ visible: true }).find(HTML(name)).exists()]);
    });
  },
  verifyIncomingRecordsItemDoesNotExist(name) {
    cy.expect([DropdownMenu({ visible: true }).find(HTML(name)).absent()]);
  },
  clickOnExistingRecordByName(name) {
    cy.do(detailsSection.find(Button({ text: name })).click());
  },
  clickCloseButton({ closeWoSaving = true } = {}) {
    cy.expect(closeButton.has({ disabled: false }));
    cy.do(closeButton.click());

    if (closeWoSaving) {
      const confirmModal = ConfirmationModal('Are you sure?');
      cy.expect(confirmModal.has({ message: 'There are unsaved changes' }));
      cy.do(confirmModal.confirm('Close without saving'));
    }
    cy.wait(300);
    cy.expect(matchProfileForm.absent());
  },
  clickSaveAndCloseButton({ profileCreated = true, profileUpdated = false } = {}) {
    cy.expect(saveAndCloseButton.has({ disabled: false }));
    cy.do(saveAndCloseButton.click());

    if (profileCreated) {
      InteractorsTools.checkCalloutMessage(
        matching(including(new RegExp(Notifications.matchProfileCreateSuccessfully))),
      );
      cy.expect(matchProfileForm.absent());
    }

    if (profileUpdated) {
      InteractorsTools.checkCalloutMessage(
        matching(including(new RegExp(Notifications.matchProfileUpdateSuccessfully))),
      );
      cy.expect(matchProfileForm.absent());
    }
  },
  verifyDetailsSection: (options) => {
    options.forEach((option) => {
      cy.get(`#panel-existing-edit [data-id=${option}]`).should('exist');
    });
  },
};
