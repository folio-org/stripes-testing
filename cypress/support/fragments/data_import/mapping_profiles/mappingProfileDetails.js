import { HTML } from '@interactors/html';
import {
  Accordion,
  including,
  MultiColumnListRow,
  Button,
  Pane,
  Checkbox,
  MultiColumnListCell,
  Modal,
  TextField
} from '../../../../../interactors';

const actionsButton = Button('Actions');
const saveButton = Button('Save as profile & Close');
const deleteButton = Button('Delete');
const fullScreenView = Pane({ id:'full-screen-view' });

const saveMappingProfile = () => {
  cy.do(saveButton.click());
};

const closeViewModeForMappingProfile = (profileName) => {
  cy.do(Pane({ title: profileName }).find(Button({ icon: 'times' })).click());
};

const checkUpdatesSectionOfMappingProfile = () => {
  cy.expect(Accordion({ id:'view-field-mappings-for-marc-updates' }).find(HTML(including('-'))).exists());
};

const checkOverrideSectionOfMappingProfile = (field, status) => {
  cy.do(MultiColumnListCell({ content: field }).perform(
    element => {
      const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');

      cy.expect(fullScreenView.find(Accordion({ id: 'override-protected-section' }))
        .find(MultiColumnListRow({ indexRow: rowNumber })).find(Checkbox())
        .has({ disabled: status }));
    }
  ));
};

export default {
  saveMappingProfile,
  checkUpdatesSectionOfMappingProfile,
  checkOverrideSectionOfMappingProfile,
  closeViewModeForMappingProfile,

  checkCreatedMappingProfile:(profileName, firstField, secondField, firstFieldStatus = true, secondFieldStatus = true) => {
    checkUpdatesSectionOfMappingProfile();
    cy.do(Accordion({ id:'override-protected-section' }).clickHeader());
    checkOverrideSectionOfMappingProfile(firstField, firstFieldStatus);
    checkOverrideSectionOfMappingProfile(secondField, secondFieldStatus);
    closeViewModeForMappingProfile(profileName);
  },

  editMappingProfile:() => {
    cy.do([
      fullScreenView.find(actionsButton).click(),
      Button('Edit').click()
    ]);
  },

  deleteMappingProfile:(name) => {
    cy.do([
      fullScreenView.find(actionsButton).click(),
      deleteButton.click(),
      Modal(including(name)).find(deleteButton).click()
    ]);
  },

  // markFieldForProtection:(field) => {
  //   cy.do(MultiColumnListCell({ content: field }).perform(
  //     element => {
  //       const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');

  //       cy.do(Pane('New field mapping profile').find(Accordion({ id: 'edit-override-protected-section' }))
  //         .find(MultiColumnListRow({ indexRow: rowNumber })).find(Checkbox())
  //         .click());
  //     }
  //   ));
  // },

  markFieldForProtection:(field) => {
    // cy.get('[class^="mclCell"]').contains(field).then(array => {
    //   array.forEach(elem => { console.log(elem); });
    //   // console.log('Array', array[0].parentElement.querySelector('input[type="checkbox"]'));

    //   array[0].querySelector('input[type="checkbox"]').click();
    // });
    cy.get('[class^="mclRow"]').then(array => {
      array.forEach(elem => {
        console.log(elem);
      });
    });
  },

  checkErrorMessageIsPresented:(textFieldName) => {
    const fieldName = TextField(textFieldName);

    cy.do(fieldName.click());
    cy.expect(fieldName.has({ error: 'Please enter a value' }));
  }
};
