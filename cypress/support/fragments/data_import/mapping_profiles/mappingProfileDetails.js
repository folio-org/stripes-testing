import { HTML } from '@interactors/html';
import {
  Accordion,
  including,
  MultiColumnListRow,
  Button,
  Pane,
  Checkbox,
  MultiColumnListCell
} from '../../../../../interactors';

const actionsButton = Button('Actions');
const saveButton = Button('Save as profile & Close');

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

      cy.expect(Pane({ id:'full-screen-view' }).find(Accordion({ id: 'override-protected-section' }))
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
      Pane({ id:'full-screen-view' }).find(actionsButton).click(),
      Button('Edit').click()
    ]);
  },

  markFieldForProtection:(field) => {
    cy.do(MultiColumnListCell({ content: field }).perform(
      element => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');

        cy.do(Pane('New field mapping profile').find(Accordion({ id: 'edit-override-protected-section' }))
          .find(MultiColumnListRow({ indexRow: rowNumber })).find(Checkbox())
          .click());
      }
    ));
  }
};
