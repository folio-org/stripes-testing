import { Button, Modal, TextField, HTML, including, MultiColumnListRow } from '../../../../interactors';

const selectUserModal = Modal('Select User');

export default {
  searchUser:(userName) => {
    cy.do(TextField({ name:'query' }).fillIn(userName));
    cy.do(Button('Search').click());
    cy.expect(selectUserModal.find(HTML(including('1 record found'))).exists());
  },

  selectUserFromList:() => {
    cy.do(selectUserModal.find(MultiColumnListRow({ indexRow: 'row-0' })).click());
    cy.expect(selectUserModal.absent());
  }
};
