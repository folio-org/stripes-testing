import {
  Button,
  Modal,
  TextField,
  MultiColumnListCell,
  matching,
  including,
  HTML,
} from '../../../../../../interactors';

const selectProfileModal = Modal({ header: matching(/Select (?:Action|Field Mapping) Profiles/) });

export default {
  searchProfile(profileName) {
    cy.do([
      selectProfileModal.find(TextField({ name: 'query' })).fillIn(profileName),
      selectProfileModal.find(Button('Search')).click(),
    ]);
    cy.expect(selectProfileModal.find(HTML(including('1 record found'))).exists());
  },
  selectProfile(profileName) {
    cy.do(
      selectProfileModal.find(MultiColumnListCell({ content: including(profileName) })).click(),
    );
    cy.expect(selectProfileModal.absent());
  },
};
