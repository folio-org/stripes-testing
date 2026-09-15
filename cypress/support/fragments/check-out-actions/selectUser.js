import {
  Button,
  Modal,
  TextField,
  HTML,
  including,
  MultiColumnListCell,
} from '../../../../interactors';

const selectUserModal = Modal('Select User');

export default {
  verifySelectUserModalExists: () => {
    cy.expect(selectUserModal.exists());
  },

  searchUser: (userName) => {
    cy.do(TextField({ name: 'query' }).fillIn(userName));
    cy.do(Button('Search').click());
    cy.expect(selectUserModal.find(HTML(including('1 record found'))).exists());
  },

  verifyFoundUserContainsPartialName(partialName) {
    cy.expect(selectUserModal.find(MultiColumnListCell(including(partialName))).exists());
  },

  selectUserFromList: (userName) => {
    cy.do(selectUserModal.find(MultiColumnListCell(including(userName))).click());
    cy.expect(selectUserModal.absent());
  },
};
