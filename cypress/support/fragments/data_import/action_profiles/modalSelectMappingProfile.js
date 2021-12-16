import { Button, Modal, TextField, HTML, including } from '../../../../../interactors';

export default {
  searchMappingProfileByName: (mappingProfileName) => {
    cy.do([
      Modal('Select Field Mapping Profiles').find(TextField({ name: 'query' })).fillIn(mappingProfileName),
      Modal('Select Field Mapping Profiles').find(Button('Search')).click(),
      Modal('Select Field Mapping Profiles').find(HTML(including('1 record found'))).exists()]);
  },

  selectMappingProfile: () => {
    cy.get('[data-row-index="row-0"]').click();
  }
};
