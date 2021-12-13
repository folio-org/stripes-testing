import { Button, Modal, TextField, MultiColumnListCell } from '../../../../../interactors';

export default class ModalSelectMappingProfile {
  static searchMappingProfileByName(mappingProfileName) {
    cy.do(Modal('Select Field Mapping Profiles').find(TextField({ name: 'query' })).fillIn(mappingProfileName));
    cy.do(Modal('Select Field Mapping Profiles').find(Button('Search')).click());
    cy.expect(MultiColumnListCell(mappingProfileName).exists());
  }

  static selectMappingProfile() {
    cy.get('[data-row-index="row-0"]').click();
  }
}
