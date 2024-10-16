import {
  Button,
  HTML,
  Modal,
  MultiColumnListCell,
  MultiColumnListRow,
  TextField,
  including,
} from '../../../../../interactors';

const selectUserModal = Modal('Select User');

function searchByName(userName) {
  cy.expect(selectUserModal.exists());
  cy.do([
    selectUserModal.find(TextField({ name: 'query' })).fillIn(userName),
    selectUserModal.find(Button('Search')).click(),
  ]);
  cy.expect(
    selectUserModal
      .find(HTML(including('Choose a filter or enter a search query to show results.')))
      .absent(),
  );
}

function selectFromSearchResults(userName, index = 0) {
  cy.do(
    selectUserModal
      .find(MultiColumnListRow({ index }))
      .find(MultiColumnListCell({ content: including(userName), columnIndex: 0 }))
      .click(),
  );
}

export default {
  selectUser(userName) {
    searchByName(userName);
    selectFromSearchResults(userName);
  },
};
