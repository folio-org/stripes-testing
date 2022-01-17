import { Button, Modal, MultiColumnListCell, TextField } from '../../../../../interactors';
import newMappingProfile from './newMappingProfile';
import SettingsDataImport from '../settingsDataImport';

const actionsButton = Button('Actions');

const iconButton = Button({ icon: 'times' });

const openNewMappingProfileForm = () => {
  cy.do([
    actionsButton.click(),
    Button('New field mapping profile').click()
  ]);
};

const closeViewModeForMappingProfile = () => {
  cy.do(iconButton.click());
};

const deleteFieldMappingProfile = (profileName) => {
  SettingsDataImport.goToMappingProfile();
  cy.do(MultiColumnListCell(profileName).click());
  cy.get('[data-pane-header-actions-dropdown]')
    .should('have.length', 2)
    .eq(1)
    .click();
  cy.do([
    Button('Delete').click(),
    Modal(`Delete "${profileName}" field mapping profile?`).find(Button('Delete')).click(),
  ]);

  cy.expect(MultiColumnListCell(profileName).absent());
};

export default {
  createMappingProfile:(mappingProfile) => {
    openNewMappingProfileForm();
    newMappingProfile.fillMappingProfile(mappingProfile);
    closeViewModeForMappingProfile();
    cy.expect(actionsButton.exists());
  },

  checkMappingProfilePresented: (mappingProfile) => {
    cy.do(TextField({ id:'input-search-mapping-profiles-field' }).fillIn(mappingProfile));
    cy.do(Button('Search').click());
    cy.expect(MultiColumnListCell(mappingProfile).exists());
  },

  deleteFieldMappingProfile
};
