import { Button, Modal, TextField } from '../../../../../interactors';

export default class ModalSelectProfile {
  static searchMappingProfileByName(mappingProfileName) {
    cy.do(Modal('Select Field Mapping Profiles').find(TextField({ name: 'query' })).fillIn(mappingProfileName));
    cy.do(Modal('Select Field Mapping Profiles').find(Button('Search')).click());
  }

  static selectMappingProfile() {
    cy.get('[data-row-index="row-0"]').click();
  }
}
