import { Button, Modal, TextField, MultiColumnListCell } from '../../../../../interactors';

export default {
  searchProfileByName: (profileName, type) => {
    const ModalSelectProfile = Modal(
      type === 'match' ? 'Select Match Profiles' : 'Select Action Profiles',
    );
    cy.do([
      ModalSelectProfile.find(TextField({ name: 'query' })).fillIn(profileName),
      ModalSelectProfile.find(Button('Search')).click(),
    ]);
    cy.expect(MultiColumnListCell(profileName).exists());
  },

  selectProfile: (name, type) => {
    const ModalSelectProfile = Modal(
      type === 'match' ? 'Select Match Profiles' : 'Select Action Profiles',
    );
    cy.do(MultiColumnListCell(name).click());
    cy.expect(MultiColumnListCell(name).absent());
    cy.expect(ModalSelectProfile.absent());
  },
};
