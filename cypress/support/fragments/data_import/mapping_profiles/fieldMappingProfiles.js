import { Button, MultiColumnListCell, TextField } from '../../../../../interactors';
import newMappingProfile from './newMappingProfile';

const actionsButton = Button('Actions');

const iconButton = Button({ icon: 'times' });

const instanceType = 'Instance';

const holdingsType = 'Holdings';

const openNewMappingProfileForm = () => {
  cy.do([
    actionsButton.click(),
    Button('New field mapping profile').click()
  ]);
};

const closeViewModeForMappingProfile = () => {
  cy.do(iconButton.click());
};

export default {

  createMappingProfile:(mappingProfile) => {
    openNewMappingProfileForm();
    if (mappingProfile.typeValue === instanceType) {
      newMappingProfile.fillInstanceMappingProfileForCreate(mappingProfile);
    } else if (mappingProfile.typeValue === holdingsType) {
      newMappingProfile.fillHoldingsMappingProfileForCreate(mappingProfile);
    } else {
      newMappingProfile.fillItemMappingProfileForCreate(mappingProfile);
    }
    closeViewModeForMappingProfile();
    cy.expect(actionsButton.exists());
  },

  checkMappingProfilePresented: (mappingProfile) => {
    cy.do(TextField({ id:'input-search-mapping-profiles-field' }).fillIn(mappingProfile));
    cy.do(Button('Search').click());
    cy.expect(MultiColumnListCell(mappingProfile).exists());
  },
};
