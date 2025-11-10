import {
  Accordion,
  Button,
  ConfirmationModal,
  Form,
  HTML,
  Section,
  Select,
  TextArea,
  TextField,
  including,
  matching,
} from '../../../../../../interactors';
import InteractorsTools from '../../../../utils/interactorsTools';
import SelectActionProfile from '../modals/selectProfileModal';
import Notifications from '../notifications';

const jobProfileForm = Form({ id: 'job-profiles-form' });
const summarySection = jobProfileForm.find(Section({ id: 'job-profile-summary' }));
const overviewSection = jobProfileForm.find(Accordion({ label: 'Overview' }));
const addActionProfileButton = overviewSection
  .find(HTML({ id: 'type-selector-dropdown-linker-root' }))
  .find(Button());
const closeButton = jobProfileForm.find(Button('Close'));
const saveAndCloseButton = jobProfileForm.find(Button('Save as profile & Close'));

const formButtons = {
  Close: closeButton,
  'Save as profile & Close': saveAndCloseButton,
};

const summarySectionFields = {
  name: summarySection.find(TextField({ name: 'profile.name' })),
  dataType: summarySection.find(Select({ name: 'profile.dataType' })),
  description: summarySection.find(TextArea({ name: 'profile.description' })),
};
export default {
  waitLoading() {
    cy.expect(jobProfileForm.exists());
  },
  verifyFormView() {
    cy.expect([
      summarySection.exists(),
      overviewSection.exists(),
      closeButton.has({ visible: true, disabled: false }),
      saveAndCloseButton.has({ visible: true, disabled: true }),
    ]);
  },
  checkButtonsConditions(buttons = []) {
    buttons.forEach(({ label, conditions }) => {
      cy.expect(formButtons[label].has(conditions));
    });
  },
  fillJobProfileFields({ summary, overview }) {
    if (summary) {
      this.fillSummaryProfileFields(summary);
    }
    if (overview) {
      this.fillOverviewProfileFields(overview);
    }
  },
  fillSummaryProfileFields({ name, dataType }) {
    if (name) {
      cy.do([summarySectionFields.name.focus(), summarySectionFields.name.fillIn(name)]);
      cy.expect(summarySectionFields.name.has({ value: name }));
    }
    if (dataType) {
      cy.do([
        summarySectionFields.dataType.focus(),
        summarySectionFields.dataType.choose(dataType),
      ]);
    }
  },
  fillOverviewProfileFields({ action, name }) {
    cy.do([
      addActionProfileButton.click(),
      Section({ id: 'menu-actions-type-selector-menu-linker-root' }).find(Button(action)).click(),
    ]);
    SelectActionProfile.searchProfile(name);
    SelectActionProfile.selectProfile(name);
    this.checkActionProfileContainer(name);
  },
  checkActionProfileContainer(profileName) {
    cy.expect(
      overviewSection
        .find(HTML({ className: including('record-container-') }))
        .has({ text: including(`Action profile: "${profileName}"`) }),
    );
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
    cy.expect(jobProfileForm.absent());
  },
  clickSaveAndCloseButton({ profileCreated = true } = {}) {
    cy.expect(saveAndCloseButton.has({ disabled: false }));
    cy.do(saveAndCloseButton.click());
    cy.expect(jobProfileForm.absent());

    if (profileCreated) {
      InteractorsTools.checkCalloutMessage(
        matching(new RegExp(Notifications.jobProfileCreatedSuccessfully)),
      );
    }
  },
};
