import { HTML, including } from '@interactors/html';
import {
  Button,
  TextField,
  Checkbox,
  Select,
  SelectionList,
  RadioButton,
  RepeatableField,
  RepeatableFieldItem,
} from '../../../../../../interactors';

const nameField = TextField('Name*');
const saveButton = Button('Save & close');
const cancelButton = Button('Cancel');
const jobProfileForImportCreateAccordion = RepeatableField({
  id: 'input-targetprofile-createJobProfileIds',
});
const jobProfileForOverlayUpdateAccordion = RepeatableField({
  id: 'input-targetprofile-updateJobProfileIds',
});
const jobProfileForImportCreateButton = Button('Add job profile for import/create');
const jobProfileForOverlayUpdateButton = Button('Add job profile for overlay/update');
const firstRadioButtonForCreateJobProfile = RadioButton({
  ariaLabel: 'Set 0 job profile for create as default',
});
const secondRadioButtonForCreateJobProfile = RadioButton({
  ariaLabel: 'Set 1 job profile for create as default',
});
const firstRadioButtonForUpdateJobProfile = RadioButton({
  ariaLabel: 'Set 0 job profile for update as default',
});
const secondRadioButtonForUpdateJobProfile = RadioButton({
  ariaLabel: 'Set 1 job profile for update as default',
});
const deleteButton = Button({ icon: 'trash' });

export default {
  // actions
  save: () => cy.do(saveButton.click()),
  fillName: (name) => {
    // TODO need to wait until page will be uploaded
    cy.wait(1500);
    cy.do(nameField.fillIn(name));
    // TODO need to wait until data will be filled
    cy.wait(1500);
  },
  addJobProfileForImportCreate: () => cy.do(jobProfileForImportCreateButton.click()),
  addJobProfileForOverlayUpdate: () => cy.do(jobProfileForOverlayUpdateButton.click()),
  selectJobProfileForImportCreate: (profileName, profileNumber = 0, rowNumber = 0) => {
    cy.do(Button({ name: `allowedCreateJobProfileIds[${profileNumber}]` }).click());
    cy.get('[class^=selectionList-]')
      .eq(rowNumber)
      .then((elements) => {
        const strings = [...elements].map((el) => el.innerText);

        expect(strings).to.have.ordered.members([...strings]);
      });
    cy.do(SelectionList().select(profileName));
  },
  selectJobProfileForOverlayUpdate: (profileName, profileNumber = 0, rowNumber = 0) => {
    cy.do(
      jobProfileForOverlayUpdateAccordion
        .find(Button({ name: `allowedUpdateJobProfileIds[${profileNumber}]` }))
        .click(),
    );
    cy.get('[class^=selectionList-]')
      .eq(rowNumber)
      .then((elements) => {
        const strings = [...elements].map((el) => el.innerText);

        expect(strings).to.have.ordered.members([...strings]);
      });
    cy.do(SelectionList().select(profileName));
  },
  setDefaultJobProfileForCreate: (profileNumber) => {
    if (!profileNumber) {
      cy.do(firstRadioButtonForCreateJobProfile.click());
      cy.expect(firstRadioButtonForCreateJobProfile.has({ checked: true }));
    } else {
      cy.do(secondRadioButtonForCreateJobProfile.click());
      cy.expect(secondRadioButtonForCreateJobProfile.has({ checked: true }));
    }
  },
  setDefaultJobProfileForUpdate: (profileNumber) => {
    if (!profileNumber) {
      cy.do(firstRadioButtonForUpdateJobProfile.click());
      cy.expect(firstRadioButtonForUpdateJobProfile.has({ checked: true }));
    } else {
      cy.do(secondRadioButtonForUpdateJobProfile.click());
      cy.expect(firstRadioButtonForUpdateJobProfile.has({ checked: false }));
    }
  },
  removeJobProfileForImportCreate: (content, rowNumber) => {
    cy.do(
      RepeatableFieldItem({ index: rowNumber })
        .find(Button({ icon: 'trash' }))
        .click(),
    );
    cy.expect(HTML(including(content)).absent());
  },

  // checks
  newFormContains: () => {
    cy.expect([
      nameField.exists(),
      TextField('URL').exists(),
      TextField('Authentication').exists(),
      TextField('External ID query map').exists(),
      TextField('Internal ID embed path').exists(),
      jobProfileForImportCreateAccordion.exists(),
      jobProfileForImportCreateButton.exists(),
      jobProfileForOverlayUpdateAccordion.exists(),
      jobProfileForOverlayUpdateButton.exists(),
      RepeatableField('Target options').exists(),
      Button('Add target option').exists(),
      Select('External identifier type').exists(),
      Checkbox({ name: 'enabled', checked: false }).exists(),
      cancelButton.exists(),
      cancelButton.has({ visible: true, disabled: false }),
      saveButton.has({ disabled: true }),
    ]);
  },
  verifyErrorMessageIsPresented: () => {
    cy.get('[class*="row--"]:first-child').contains('Please select to continue');
    cy.get('[class*="row--"]:last-child').contains('Please select to continue');
  },
  verifyJobProfileForImportCreateAccordion: () => {
    cy.do(jobProfileForImportCreateAccordion.find(Button({ icon: 'info' })).click());
    cy.get('[class*="content"]').contains(
      'Review the listed job profiles carefully before assigning for Inventory single record imports. Only MARC Bibliographic job profiles can be assigned, not MARC Holdings or MARC Authority job profiles.',
    );
    // TODO need to wait until list will be uploaded
    cy.wait(5000);
    cy.do(
      jobProfileForImportCreateAccordion
        .find(Button({ id: 'input-targetprofile-createJobProfileIds-add-button' }))
        .click(),
    );
    cy.expect([
      RepeatableFieldItem()
        .find(Button({ name: 'allowedCreateJobProfileIds[0]' }))
        .exists(),
      RadioButton({ name: 'createJobProfileId' }).exists(),
      deleteButton.exists(),
      jobProfileForImportCreateButton.exists(),
    ]);
  },
  verifyJobProfileForOverlayUpdateAccordion: () => {
    cy.do(jobProfileForOverlayUpdateAccordion.find(Button({ icon: 'info' })).click());
    cy.get('[class*="content"]').contains(
      'Review the listed job profiles carefully before assigning for Inventory single record imports. Only MARC Bibliographic job profiles can be assigned, not MARC Holdings or MARC Authority job profiles.',
    );
    // TODO need to wait until list will be uploaded
    cy.wait(5000);
    cy.do(
      jobProfileForOverlayUpdateAccordion
        .find(Button({ id: 'input-targetprofile-updateJobProfileIds-add-button' }))
        .click(),
    );
    cy.expect([
      jobProfileForOverlayUpdateAccordion
        .find(Button({ name: 'allowedUpdateJobProfileIds[0]' }))
        .exists(),
      RadioButton({ name: 'updateJobProfileId' }).exists(),
      deleteButton.exists(),
      jobProfileForImportCreateButton.exists(),
    ]);
  },
  verifyJobProfileForImportCreateIsRemoved: () => {
    cy.expect(
      jobProfileForImportCreateAccordion
        .find(Button({ name: 'allowedCreateJobProfileIds[1]' }))
        .absent(),
    );
  },
};
