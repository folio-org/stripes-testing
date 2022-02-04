import { TextField, Select, Button } from '../../../../../interactors';

export default {
  fillJobProfile: (profileName, mappingProfileName) => {
    cy.do([
      TextField({ id: 'job-profile-name' }).fillIn(profileName),
      Select({ id: 'mapping-profile-id' }).choose(mappingProfileName),
    ]);
  },

  saveJobProfile:() => {
    cy.do(Button('Save & close').click());
  },
};
