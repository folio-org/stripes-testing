import { Button } from '../../../../../interactors';
import exportNewFieldMappingProfile from './exportNewFieldMappingProfile';

const saveAndCloseButton = Button('Save & close');

const openNewMappingProfileForm = () => {
  cy.do(Button('New').click());
};

const saveMappingProfile = () => {
  cy.do(saveAndCloseButton.click());
  cy.expect(saveAndCloseButton.absent());
};

export default {
  createMappingProfile:(mappingProfile) => {
    openNewMappingProfileForm();
    exportNewFieldMappingProfile.fillMappingProfile(mappingProfile);
    saveMappingProfile();
  },

  createMappingProfileForItemHrid:(mappingProfile) => {
    openNewMappingProfileForm();
    exportNewFieldMappingProfile.fillMappingProfileForItemHrid(mappingProfile);
    saveMappingProfile();
  }
};
