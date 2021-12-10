import { Button, Modal, TextField } from '../../../../../interactors';

export default class ModalSelectActionProfile {
  static searchActionProfileByName(actionProfileName) {
    cy.do(Modal('Select Action Profiles').find(TextField({ name: 'query' })).fillIn(actionProfileName));
    cy.do(Modal('Select Action Profiles').find(Button('Search')).click());
  }

  static selectActionProfile() {
    cy.get('[data-row-index="row-0"]').click();
  }
}
