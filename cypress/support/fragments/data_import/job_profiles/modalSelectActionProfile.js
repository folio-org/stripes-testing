import { Button, Modal, TextField, MultiColumnListCell } from '../../../../../interactors';

const modalSelectProfile = Modal('Select Action Profiles');

export default {
  searchActionProfileByName: (actionProfileName) => {
    cy.do([
      modalSelectProfile.find(TextField({ name: 'query' })).fillIn(actionProfileName),
      modalSelectProfile.find(Button('Search')).click()]);
    cy.expect(MultiColumnListCell(actionProfileName).exists());
  },

  selectActionProfile: (name) => {
    cy.do(MultiColumnListCell(name).click());
    cy.expect(MultiColumnListCell(name).absent());
    cy.expect(modalSelectProfile.absent());
  }
};
