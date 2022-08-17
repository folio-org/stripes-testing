import { HTML } from '@interactors/html';
import { Accordion, including, MultiColumnListRow, Button, Pane, Checkbox } from '../../../../../interactors';

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

const checkOverrideSectionOfMappingProfile = (row, field, status) => {
  cy.expect(Accordion({ id: 'override-protected-section' })
    .find(MultiColumnListRow({ indexRow: `row-${row}` })).find(HTML(including(field)))
    .exists());
  cy.expect(Accordion({ id: 'override-protected-section' })
    .find(MultiColumnListRow({ indexRow: `row-${row}` })).find(Checkbox()).has({ disabled: status }));
};

export default {
  saveMappingProfile,
  checkUpdatesSectionOfMappingProfile,
  checkOverrideSectionOfMappingProfile,

  checkCreatedMappingProfile:(firstField, secondField, secondRow = 1, firstRow = 0, firstFieldStatus = true, secondFieldStatus = true) => {
    checkUpdatesSectionOfMappingProfile();
    cy.do(Accordion({ id:'override-protected-section' }).clickHeader());
    checkOverrideSectionOfMappingProfile(firstRow, firstField, firstFieldStatus);
    checkOverrideSectionOfMappingProfile(secondRow, secondField, secondFieldStatus);
  },

  editMappingProfile:() => {
    cy.do([
      Pane({ id:'full-screen-view' }).find(actionsButton).click(),
      Button('Edit').click()
    ]);
  },

  markFieldForProtection:(profileName, row = 0) => {
    cy.do(Accordion({ id: 'edit-override-protected-section' })
      .find(MultiColumnListRow({ indexRow: `row-${row}` }))
      .find(Checkbox())
      .click());
    saveMappingProfile();
    closeViewModeForMappingProfile(profileName);
  },
};
