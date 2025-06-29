import { including, matching } from '@interactors/html';
import {
  Accordion,
  Button,
  ConfirmationModal,
  Form,
  MultiColumnListCell,
  Section,
  Select,
  TextArea,
  TextField,
} from '../../../../../../interactors';
import InteractorsTools from '../../../../utils/interactorsTools';
import SelectMappingProfile from '../modals/selectProfileModal';
import Notifications from '../notifications';

const actionProfileForm = Form({ id: 'action-profiles-form' });
const summarySection = actionProfileForm.find(Accordion({ label: 'Summary' }));
const detailsSection = actionProfileForm.find(Accordion({ label: 'Details' }));
const mappingProfileSection = actionProfileForm.find(
  Section({ id: 'actionProfileFormAssociatedMappingProfileAccordion' }),
);

const closeButton = actionProfileForm.find(Button('Close'));
const saveAndCloseButton = actionProfileForm.find(Button('Save as profile & Close'));

const summarySectionFields = {
  name: summarySection.find(TextField({ name: 'profile.name' })),
  description: summarySection.find(TextArea({ name: 'profile.description' })),
};
const detailsSectionFields = {
  action: detailsSection.find(Select({ name: 'profile.action' })),
  recordType: detailsSection.find(Select({ name: 'profile.folioRecord' })),
};
const formButtons = {
  Close: closeButton,
  'Save as profile & Close': saveAndCloseButton,
};

export default {
  waitLoading() {
    cy.expect(actionProfileForm.exists());
  },
  verifyFormView() {
    cy.expect([
      summarySection.exists(),
      detailsSection.exists(),
      mappingProfileSection.exists(),
      closeButton.has({ visible: true, disabled: false }),
      saveAndCloseButton.has({ visible: true, disabled: true }),
    ]);
  },
  checkButtonsConditions(buttons = []) {
    buttons.forEach(({ label, conditions }) => {
      cy.expect(formButtons[label].has(conditions));
    });
  },
  fillActionProfileFields({ summary, details, fieldMappingProfile }) {
    if (summary) {
      this.fillSummaryProfileFields(summary);
    }
    if (details) {
      this.fillDetailsProfileFields(details);
    }
    if (fieldMappingProfile) {
      this.addFieldMappingProfile(fieldMappingProfile);
    }
  },
  fillSummaryProfileFields({ name }) {
    if (name) {
      cy.do([summarySectionFields.name.focus(), summarySectionFields.name.fillIn(name)]);
      cy.expect(summarySectionFields.name.has({ value: name }));
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
  addFieldMappingProfile(profile) {
    cy.do(mappingProfileSection.find(Button('Link Profile')).click());
    SelectMappingProfile.searchProfile(profile.name);
    SelectMappingProfile.selectProfile(profile.name);
    this.checkFieldMappingProfileTableContent(profile);
  },
  checkFieldMappingProfileTableContent({ name, recordType }) {
    if (name) {
      cy.expect(
        mappingProfileSection
          .find(MultiColumnListCell({ row: 0, column: 'Name' }))
          .has({ content: including(name) }),
      );
    }
    if (recordType) {
      cy.expect(
        mappingProfileSection
          .find(MultiColumnListCell({ row: 0, column: 'FOLIO record type' }))
          .has({ content: including(recordType) }),
      );
    }
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
    cy.expect(actionProfileForm.absent());
  },
  clickSaveAndCloseButton({ profileCreated = true } = {}) {
    cy.expect(saveAndCloseButton.has({ disabled: false }));
    cy.do(saveAndCloseButton.click());
    cy.expect(actionProfileForm.absent());

    if (profileCreated) {
      InteractorsTools.checkCalloutMessage(
        matching(new RegExp(Notifications.actionProfileCreatedSuccessfully)),
      );
    }
  },
};
