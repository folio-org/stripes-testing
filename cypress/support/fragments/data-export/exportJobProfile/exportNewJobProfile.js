import {
  Button,
  Checkbox,
  PaneHeader,
  TextField,
  Select,
  TextArea,
  TextFieldIcon,
  TextInput,
  HTML,
} from '../../../../../interactors';

const paneHeader = PaneHeader('New job profile');
const XButton = paneHeader.find(Button({ icon: 'times' }));
const saveAndCloseButton = Button('Save & close');
const cancelButton = Button('Cancel');
const nameTextfield = TextField('Name*');
const descriptionTextarea = TextArea('Description');
const selectMappingProfileDropdown = Select({ name: 'mappingProfileId' });
const lockProfileCheckbox = Checkbox('Lock profile');

export default {
  fillJobProfile: (profileName, mappingProfileName) => {
    cy.do(TextField({ id: 'job-profile-name' }).fillIn(profileName));
    cy.wait(2000);
    cy.do(Select({ name: 'mappingProfileId' }).choose(mappingProfileName));
  },

  saveJobProfile: () => {
    cy.do(saveAndCloseButton.click());
  },

  verifyNewJobProfileForm() {
    cy.expect([
      paneHeader.exists(),
      XButton.exists(),
      nameTextfield.exists(),
      Select('Mapping profile*').exists(),
      selectMappingProfileDropdown.exists(),
      descriptionTextarea.exists(),
      saveAndCloseButton.has({ disabled: true }),
      cancelButton.has({ disabled: false }),
    ]);
  },

  verifyLockProfileCheckbox(isChecked, isDisabled) {
    cy.expect(lockProfileCheckbox.has({ checked: isChecked, disabled: isDisabled }));
  },

  clickNameTextfield() {
    cy.do(nameTextfield.find(TextInput()).click());
  },

  clickDescriptionTextarea() {
    cy.do(descriptionTextarea.click());
  },

  verifyNameValidationError() {
    cy.expect([
      nameTextfield.find(TextFieldIcon({ id: 'icon-job-profile-name-validation-error' })).exists(),
      nameTextfield.has({ valid: false }),
      nameTextfield.find(HTML('Please enter a value')).exists(),
    ]);
  },

  verifyNameValidationErrorGone() {
    cy.expect(nameTextfield.find(HTML('Please enter a value')).absent());
  },

  fillinNameTextfield(content) {
    cy.do(nameTextfield.fillIn(content));
  },

  verifyClearNameButtonExists() {
    cy.expect(nameTextfield.find(Button({ icon: 'times-circle-solid' })).exists());
  },

  verifySaveAndCloseButtonEnabled() {
    cy.do(saveAndCloseButton.has({ disabled: false }));
  },

  clickSelectMappingProfileDropdown() {
    cy.do(selectMappingProfileDropdown.focus());
  },

  verifySelectMappingProfileValidationError() {
    cy.expect([
      selectMappingProfileDropdown.has({ valid: false }),
      selectMappingProfileDropdown.find(HTML('Please enter a value')).exists(),
    ]);
  },

  selectMappingProfileFromDropdown(mappingProfileName) {
    cy.do(selectMappingProfileDropdown.choose(mappingProfileName));
  },

  verifySelectMappingProfileValidationErrorGone() {
    cy.expect([
      selectMappingProfileDropdown.has({ valid: true }),
      selectMappingProfileDropdown.find(HTML('Please enter a value')).absent(),
    ]);
  },

  fillinDescription(descriptionText) {
    cy.do(descriptionTextarea.fillIn(descriptionText));
  },

  verifyAllMappingProfilesPresentInDropdown() {
    cy.getDataExportMappingProfiles({ limit: 1000 }).then((profiles) => {
      const mappingProfilesNames = profiles
        .map((profile) => profile.name)
        .sort((a, b) => a.localeCompare(b));

      cy.then(() => selectMappingProfileDropdown.optionsText()).then((options) => {
        cy.expect(options, 'Dropdown options should match all mapping profiles').to.deep.equal(
          mappingProfilesNames,
        );
      });
    });
  },

  verifyMappingProfilesOrderedAlphabetically() {
    cy.then(() => selectMappingProfileDropdown.optionsText()).then((options) => {
      const sortedOptions = [...options].sort((a, b) => a.localeCompare(b));

      cy.expect(options).to.deep.equal(sortedOptions);
    });
  },

  createNewJobProfileViaApi: (name, mappingProfileId) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'data-export/job-profiles',
        body: {
          mappingProfileId,
          name,
        },
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response;
      });
  },
};
