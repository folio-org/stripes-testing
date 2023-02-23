import { Button, Pane, NavListItem } from '../../../../../interactors';
import exportNewFieldMappingProfile from './exportNewFieldMappingProfile';

const saveAndCloseButton = Button('Save & close');
const fieldMappingProfilesPane = Pane('Field mapping profiles');

const openNewMappingProfileForm = () => {
  cy.do(Button('New').click());
};

const saveMappingProfile = () => {
  cy.do(saveAndCloseButton.click());
  cy.expect(saveAndCloseButton.absent());
};

export default {
  saveMappingProfile,
  createMappingProfile: (mappingProfile) => {
    openNewMappingProfileForm();
    exportNewFieldMappingProfile.fillMappingProfile(mappingProfile);
    saveMappingProfile();
  },

  createMappingProfileForItemHrid: (mappingProfile) => {
    openNewMappingProfileForm();
    exportNewFieldMappingProfile.fillMappingProfileForItemHrid(mappingProfile);
    saveMappingProfile();
  },

  goTofieldMappingProfilesTab() {
    cy.do(NavListItem('Data export').click());
    cy.expect(Pane('Data export').exists());
    cy.do(NavListItem('Field mapping profiles').click());
    cy.expect(fieldMappingProfilesPane.exists());
  },
};
