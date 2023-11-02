import {
  Button,
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

export default {
  fillJobProfile: (profileName, mappingProfileName) => {
    cy.do([
      TextField({ id: 'job-profile-name' }).fillIn(profileName),
      Select({ id: 'mapping-profile-id' }).choose(mappingProfileName),
    ]);
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
      HTML('Please enter a value').exists(),
    ]);
  },
  verifyNameValidationErrorGone() {
    cy.expect(HTML('Please enter a value').absent());
  },
  fillinNameTextfield(content) {
    cy.do(nameTextfield.fillIn(content));
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
      HTML('Please enter a value').exists(),
    ]);
  },
  selectMappingProfileFromDropdown(mappingProfileName) {
    cy.do(selectMappingProfileDropdown.choose(mappingProfileName));
  },
  verifySelectMappingProfileValidationErrorGone() {
    cy.expect([
      selectMappingProfileDropdown.has({ valid: true }),
      HTML('Please enter a value').absent(),
    ]);
  },
  fillinDescription(descriptionText) {
    cy.do(descriptionTextarea.fillIn(descriptionText));
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
