import { Button, Modal, TextField, HTML, including, MultiColumnListCell, MultiColumnListRow } from '../../../../../interactors';

const modalSelectProfile = Modal('Select Field Mapping Profiles');

export default {
  searchMappingProfileByName: (mappingProfileName) => {
    cy.do([
      modalSelectProfile.find(TextField({ name: 'query' })).fillIn(mappingProfileName),
      modalSelectProfile.find(Button('Search')).click()]);
    cy.expect(modalSelectProfile.find(HTML(including('1 record found'))).exists());
    cy.expect(modalSelectProfile.find(MultiColumnListRow({ index: 0 })).exists());
    cy.expect(modalSelectProfile.find(MultiColumnListRow({ index: 0 })).find(MultiColumnListCell(mappingProfileName)).exists());
    cy.expect(modalSelectProfile.find(MultiColumnListRow({ index: 1 })).absent());
  },

  selectMappingProfile: (specialMappingProfileName) => {
    cy.do(modalSelectProfile.find(MultiColumnListCell(specialMappingProfileName)).click());
    cy.expect(modalSelectProfile.absent());
  }
};
