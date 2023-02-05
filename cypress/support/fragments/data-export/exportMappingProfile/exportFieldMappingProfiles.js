import { Button } from '../../../../../interactors';
import exportNewFieldMappingProfile from './exportNewFieldMappingProfile';

const openNewMappingProfileForm = () => {
  cy.do(Button('New').click());
};

const saveMappingProfile = () => {
  cy.do(Button('Save & close').click());
  cy.expect(Button('Save & close').absent());
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
