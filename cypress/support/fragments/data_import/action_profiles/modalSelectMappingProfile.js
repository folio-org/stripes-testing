import { Button, Modal, TextField, HTML, including, MultiColumnListCell } from '../../../../../interactors';

const modalSelectProfile = Modal('Select Field Mapping Profiles');

export default {
  searchMappingProfileByName: (mappingProfileName) => {
    cy.do([
      modalSelectProfile.find(TextField({ name: 'query' })).fillIn(mappingProfileName),
      modalSelectProfile.find(Button('Search')).click()]);
    cy.expect(modalSelectProfile.find(HTML(including('1 record found'))).exists());
  },

  selectMappingProfile: (specialMappingProfileName) => {
    cy.do(modalSelectProfile.find(MultiColumnListCell(specialMappingProfileName)).click());
  }
};
