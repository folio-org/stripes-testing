import { Button, Modal, TextField, MultiColumnListCell } from '../../../../../interactors';

export default {
  searchActionProfileByName: (profileName, type) => {
    const modalSelectProfile = Modal(type === 'match' ? 'Select Match Profiles' : 'Select Action Profiles');
    cy.do([
      modalSelectProfile.find(TextField({ name: 'query' })).fillIn(profileName),
      modalSelectProfile.find(Button('Search')).click()]);
    cy.expect(MultiColumnListCell(profileName).exists());
  },

  selectActionProfile: (name, type) => {
    const modalSelectProfile = Modal(type === 'match' ? 'Select Match Profiles' : 'Select Action Profiles');
    cy.do(MultiColumnListCell(name).click());
    cy.expect(MultiColumnListCell(name).absent());
    cy.expect(modalSelectProfile.absent());
  }
};
