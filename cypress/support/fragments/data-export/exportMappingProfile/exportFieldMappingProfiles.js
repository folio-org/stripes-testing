import { Button } from '../../../../../interactors';
import exportNewFieldMappingProfile from './exportNewFieldMappingProfile';

const openNewMappingProfileForm = () => {
  cy.do(Button('New').click());
};

export default {
  createMappingProfile:(mappingProfile) => {
    openNewMappingProfileForm();
    exportNewFieldMappingProfile.fillMappingProfile(mappingProfile);
  },
};
