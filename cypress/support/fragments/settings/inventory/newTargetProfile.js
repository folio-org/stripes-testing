import { HTML, including } from '@interactors/html';
import {
  Button,
  TextField,
  Checkbox,
  Select,
  Pane,
  SelectionList,
  RadioButton,
  RepeatableField,
  RepeatableFieldItem
} from '../../../../../interactors';

const nameField = TextField('Name*');
const saveButton = Button('Save & close');
const cancelButton = Button('Cancel');
const newPane = Pane('New');
const jobProfileForImportCreateAccordion = RepeatableField({ id:'input-targetprofile-createJobProfileIds' });
const jobProfileForOverlayUpdateAccordion = RepeatableField({ id:'input-targetprofile-updateJobProfileIds' });
const jobProfileForImportCreateButton = Button('Add job profile for import/create');
const jobProfileForOverlayUpdateButton = Button('Add job profile for overlay/update');
const firstRadioButtonForCreateJobProfile = RadioButton({ ariaLabel:'Set 0 job profile for create as default' });
const secondRadioButtonForCreateJobProfile = RadioButton({ ariaLabel:'Set 1 job profile for create as default' });
const firstRadioButtonForUpdateJobProfile = RadioButton({ ariaLabel:'Set 0 job profile for update as default' });
const secondRadioButtonForUpdateJobProfile = RadioButton({ ariaLabel:'Set 1 job profile for update as default' });
const deleteButton = Button({ icon:'trash' });

export default {
  // actions
  save:() => cy.do(saveButton.click()),
  fillName:(name) => {
    cy.wait(1500);
    cy.do(nameField.fillIn(name));
  },
  addJobProfileForImportCreate:() => cy.do(jobProfileForImportCreateButton.click()),
  addJobProfileForOverlayUpdate:() => cy.do(jobProfileForOverlayUpdateButton.click()),
  selectJobProfileForImportCreate:(profileName, profileNumber = 0) => {
    cy.do([
      Button({ name:`allowedCreateJobProfileIds[${profileNumber}]` }).click(),
      SelectionList().select(profileName)
    ]);
    // list is in alhabetical order
  },
  selectJobProfileForOverlayUpdate:(profileName, profileNumber = 0) => {
    cy.do([
      jobProfileForOverlayUpdateAccordion
        .find(Button({ name:`allowedUpdateJobProfileIds[${profileNumber}]` })).click(),
      SelectionList().select(profileName)
    ]);
    // list is in alhabetical order
  },
  setDefaultJobProfileForCreate:(profileNumber) => {
    if (!profileNumber) {
      cy.do(firstRadioButtonForCreateJobProfile.click());
      cy.expect([
        firstRadioButtonForCreateJobProfile.has({ checked: true }),
        secondRadioButtonForCreateJobProfile.has({ checked: false })
      ]);
    } else {
      cy.do(secondRadioButtonForCreateJobProfile.click());
      cy.expect([
        firstRadioButtonForCreateJobProfile.has({ checked: false }),
        secondRadioButtonForCreateJobProfile.has({ checked: true })
      ]);
    }
  },
  setDefaultJobProfileForUpdate:(profileNumber) => {
    if (!profileNumber) {
      cy.do(firstRadioButtonForUpdateJobProfile.click());
      cy.expect([
        firstRadioButtonForUpdateJobProfile.has({ checked: true }),
        secondRadioButtonForUpdateJobProfile.has({ checked: false })
      ]);
    } else {
      cy.do(secondRadioButtonForUpdateJobProfile.click());
      cy.expect([
        firstRadioButtonForUpdateJobProfile.has({ checked: false }),
        secondRadioButtonForUpdateJobProfile.has({ checked: true })
      ]);
    }
  },
  removeJobProfileForImportCreate:(content) => {
    cy.contains('div[class^="repeatableFieldItem-"]', content)
      .then(elem => {
        cy.pause();
        elem.parent()[0].querySelector('button[icon="trash"]').click();
      });
    cy.expect(HTML(including(content))).absent();
  },

  // checks
  newFormContains:() => {
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
      saveButton.has({ disabled: true })
    ]);
  },
  verifyErrorMessageIsPresented:() => {
    cy.expect([
      newPane.find(HTML(including('Please select to continue'))),
      //   jobProfileForOverlayUpdateAccordion.has({ error: 'Please select to continue' }),
      newPane.exists()
    ]);
  },
  verifyJobProfileForImportCreateAccordion:() => {
    cy.do(jobProfileForImportCreateAccordion.find(Button({ icon:'info' })).click());
    cy.get('[class*="content"]').contains('Review the listed job profiles carefully before assigning for Inventory single record imports. Only MARC Bibliographic job profiles can be assigned, not MARC Holdings or MARC Authority job profiles.');
    cy.wait(5000);
    cy.do(jobProfileForImportCreateAccordion
      .find(Button({ id:'input-targetprofile-createJobProfileIds-add-button' })).click());
    cy.expect([RepeatableFieldItem().find(Button({ name:'allowedCreateJobProfileIds[0]' })).exists(),
      RadioButton({ name:'createJobProfileId' }).exists(),
      deleteButton.exists(),
      jobProfileForImportCreateButton.exists()
    ]);
  },
  verifyJobProfileForOverlayUpdateAccordion:() => {
    cy.do(jobProfileForOverlayUpdateAccordion.find(Button({ icon:'info' })).click());
    cy.get('[class*="content"]')
      .contains('Review the listed job profiles carefully before assigning for Inventory single record imports. Only MARC Bibliographic job profiles can be assigned, not MARC Holdings or MARC Authority job profiles.');
    cy.wait(5000);
    cy.do(jobProfileForOverlayUpdateAccordion
      .find(Button({ id:'input-targetprofile-updateJobProfileIds-add-button' })).click());
    cy.expect([jobProfileForOverlayUpdateAccordion.find(Button({ name:'allowedUpdateJobProfileIds[0]' })).exists(),
      RadioButton({ name:'updateJobProfileId' }).exists(),
      deleteButton.exists(),
      jobProfileForImportCreateButton.exists()
    ]);
  },
  verifyJobProfileForImportCreateIsRemoved:() => {
    cy.expect(jobProfileForImportCreateAccordion.find(Button({ name:'allowedCreateJobProfileIds[1]' })).absent());
  }
};
