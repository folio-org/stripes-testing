import { Button } from '../../../../../interactors';
import exportNewJobProfile from './exportNewJobProfile';

const openNewJobProfileForm = () => {
  cy.do(Button('New').click());
};

export default {
  createJobProfile:(profileName, mappingProfile) => {
    openNewJobProfileForm();
    exportNewJobProfile.fillJobProfile(profileName, mappingProfile);
    exportNewJobProfile.saveJobProfile();
  },
};
