import { Button, MultiColumnListCell, Section } from '../../../../../interactors';
import { getLongDelay } from '../../../utils/cypressTools';
import newMappingProfile from './newMappingProfile';

const actionsButton = Button('Actions');

const openNewMappingProfileForm = () => {
  cy.do([
    actionsButton.click(),
    Button('New field mapping profile').click()
  ]);
};

const closeViewModeForMappingProfile = () => {
  cy.do(Button('Close'));
};

// TODO create search mapping profile instead wait
const waitLoadingMappingProfile = () => {
  cy.get('[id="full-screen-view-content"]', getLongDelay())
    .should('be.visible');
  cy.expect(actionsButton.exists());
};

const waitLoadingList = () => {
  cy.get('[id="mapping-profiles-list"]', getLongDelay())
    .should('be.visible');
  cy.expect(actionsButton.exists());
};

export default {
  waitLoadingMappingProfile,

  create:(mappingProfile) => {
    openNewMappingProfileForm();
    newMappingProfile.fillMappingProfile(mappingProfile);
    waitLoadingMappingProfile();
    closeViewModeForMappingProfile();
    waitLoadingList();
  },

  checkMappingProfilePresented: (mappingProfile) => {
    cy.expect(Section({ id: 'pane-results' }).find(MultiColumnListCell(mappingProfile.name)).exists());
  },
};
