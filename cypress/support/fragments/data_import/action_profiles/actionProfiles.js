import { Button, TextField, MultiColumnListCell, Modal } from '../../../../../interactors';
import newActionProfile from './newActionProfile';
import SettingsDataImport from '../settingsDataImport';

const actionsButton = Button('Actions');

const openNewActionProfileForm = () => {
  cy.do([
    actionsButton.click(),
    Button('New action profile').click()
  ]);
};

const deleteActionProfile = (profileName) => {
  SettingsDataImport.goToActionProfile();
  cy.do(MultiColumnListCell(profileName).click());
  cy.get('[data-pane-header-actions-dropdown]')
    .should('have.length', 2)
    .eq(1)
    .click();
  cy.do([
    Button('Delete').click(),
    Modal(`Delete "${profileName}" action profile?`).find(Button('Delete')).click(),
  ]);

  cy.expect(MultiColumnListCell(profileName).absent());
};

export default {
  createActionProfile:(actionProfile, mappingProfile) => {
    openNewActionProfileForm();
    newActionProfile.fillActionProfile(actionProfile);
    newActionProfile.linkMappingProfile(mappingProfile);
  },

  checkActionProfilePresented: (actionProfile) => {
    cy.do(TextField({ id:'input-search-action-profiles-field' }).fillIn(actionProfile));
    cy.do(Button('Search').click());
    cy.expect(MultiColumnListCell(actionProfile).exists());
  },

  deleteActionProfile,
};
