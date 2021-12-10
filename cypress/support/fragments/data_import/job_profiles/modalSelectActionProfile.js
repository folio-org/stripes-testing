import { Button, Modal, TextField, MultiColumnListCell } from '../../../../../interactors';

export default class ModalSelectActionProfile {
  static searchActionProfileByName(actionProfileName) {
    cy.do(Modal('Select Action Profiles').find(TextField({ name: 'query' })).fillIn(actionProfileName));
    cy.do(Modal('Select Action Profiles').find(Button('Search')).click());
    cy.expect(MultiColumnListCell(actionProfileName).exists());
  }

  static selectActionProfile(name) {
    cy.do(MultiColumnListCell(name).click());
    cy.expect(MultiColumnListCell(name).absent());
    cy.expect(Modal('Select Action Profiles').absent());
  }
}
