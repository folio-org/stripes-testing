import {
  Modal,
  Button,
  TextField,
  MultiColumnList,
  including,
  MultiColumnListCell,
} from '../../../../../interactors';

const selectUserModal = Modal('Select User');
const searchField = TextField({ type: 'search' });
const searchButton = Button('Search');
const usersList = MultiColumnList({ id: 'list-plugin-find-user' });
export default {
  verifyModalIsShown() {
    cy.expect(selectUserModal.exists());
  },

  searchForNote(userName) {
    cy.do([searchField.fillIn(userName), searchButton.click()]);
  },

  findAndSelectUser(userName) {
    this.searchForNote(userName);
    cy.expect(usersList.exists());
    cy.do([selectUserModal.find(MultiColumnListCell(including(userName))).click()]);
  },
};
