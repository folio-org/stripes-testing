import {
  Button,
  HTML,
  Modal,
  TextField,
  MultiColumnListCell,
  including,
} from '../../../../../interactors';

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

  searchProfileByNameAbsent: (profileName, type) => {
    const ModalSelectProfile = Modal(
      type === 'match' ? 'Select Match Profiles' : 'Select Action Profiles',
    );
    cy.do([
      ModalSelectProfile.find(TextField({ name: 'query' })).fillIn(profileName),
      ModalSelectProfile.find(Button('Search')).click(),
    ]);
    cy.expect(ModalSelectProfile.find(HTML(including('0 records found'))).exists());
    cy.expect(MultiColumnListCell(profileName).absent());
  },

  selectProfile: (name, type) => {
    const ModalSelectProfile = Modal(
      type === 'match' ? 'Select Match Profiles' : 'Select Action Profiles',
    );
    cy.wait(2000);
    cy.do(MultiColumnListCell(name).click());
    cy.expect(MultiColumnListCell(name).absent());
    cy.expect(ModalSelectProfile.absent());
  },
};
