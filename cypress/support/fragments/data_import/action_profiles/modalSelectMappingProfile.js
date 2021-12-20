import { Button, Modal, TextField, HTML, including } from '../../../../../interactors';

const modalSelectProfile = Modal('Select Field Mapping Profiles');

export default {
  searchMappingProfileByName: (mappingProfileName) => {
    cy.do([
      modalSelectProfile.find(TextField({ name: 'query' })).fillIn(mappingProfileName),
      modalSelectProfile.find(Button('Search')).click(),
      modalSelectProfile.find(HTML(including('1 record found'))).exists()]);
  },

  selectMappingProfile: () => {
    cy.get('[data-row-index="row-0"]').click();
  }
};
