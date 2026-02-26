import {
  Button,
  Checkbox,
  including,
  Modal,
  MultiColumnListCell,
  TextArea,
  TextField,
} from '../../../../../interactors';

const saveAndCloseButton = Button('Save & close');
const searchButton = Button('Search');
const findUserButton = Button({ id: 'clickable-plugin-find-user' });
const userSearchModal = Modal('Select User');
const searchTextField = TextField({ type: 'search' });
const firstSearchResult = MultiColumnListCell({ row: 0, columnIndex: 0 });
const checkboxAll = Checkbox();

export default {
  fillInRoutingListInfoAndSave: (name) => {
    cy.do([TextField({ id: 'input-routing-list-name' }).fillIn(name), saveAndCloseButton.click()]);
  },

  fillInRoutingListAndCancel: (name) => {
    cy.do([
      TextField({ id: 'input-routing-list-name' }).fillIn(name),
      Button('Cancel').click(),
      Modal('Are you sure?').find(Button('Close without saving')).click(),
    ]);
  },

  fillInRoutingListInfoWithNotesAndSave: (name, notes) => {
    cy.do([
      TextField({ id: 'input-routing-list-name' }).fillIn(name),
      TextArea({ name: 'notes' }).fillIn(notes),
      saveAndCloseButton.click(),
    ]);
  },

  addUserToRoutingList() {
    cy.do(Button({ id: 'clickable-plugin-find-user' }).click());
  },

  unAssignAllUsers() {
    cy.do([
      Button({ id: 'clickable-remove-all-permissions' }).click(),
      Modal('Unassign all users').find(Button('Yes')).click(),
    ]);
  },

  deleteUserFromRoutingList(user) {
    cy.do(Button({ id: `clickable-remove-user-${user}` }).click());
  },

  assignUser: (userName) => {
    cy.do([
      findUserButton.click(),
      userSearchModal.find(searchTextField).fillIn(userName),
      searchButton.click(),
    ]);
    cy.wait(4000);
    cy.do([
      userSearchModal.find(firstSearchResult).find(checkboxAll).click(),
      userSearchModal.find(Button('Save')).click(),
    ]);
  },

  checkUserIsAdded(user) {
    cy.expect(MultiColumnListCell(including(user)).exists());
  },

  checkUserIsAbsent(user) {
    cy.expect(MultiColumnListCell(including(user)).absent());
  },

  fillInRoutingListInfo: (name) => {
    cy.do(TextField({ id: 'input-routing-list-name' }).fillIn(name));
  },

  saveRoutingList: () => {
    cy.do(saveAndCloseButton.click());
  },
};
