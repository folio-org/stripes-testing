import { Button, TextField, MultiColumnListCell, Checkbox, Modal, Pane, Section } from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';

const auListPane = Pane({ id: 'pane-ac-units-list' });
const viewCheckbox = Checkbox('View');
const saveAUButton = Button({ id: 'save-ac-unit-button' });
const findUserButton = Button({ id: 'clickable-plugin-find-user' });
const userSearchModal = Modal('Select User');
const searchTextField = TextField({ type: 'search' });
const firstSearchResult = MultiColumnListCell({ row: 0, columnIndex: 0 });
const saveButton = Button('Save');
const trashButton = Button({ icon: 'trash' });
const assignedUsersSection = Section({ id: 'memberships' });
const actionsButton = Button('Actions');
const auPaneDetails = Section({ id: 'pane-ac-units-details' });
const checkboxAll = Checkbox();
const searchButton = Button('Search');
const nameTextField = TextField({ name: 'name' });

export default {

  defaultAcquisitionUnit : {
    name: `AU_${getRandomPostfix()}`,
  },

  waitLoading : () => {
    cy.expect(auListPane.exists());
  },

  newAcquisitionUnit: () => {
    cy.do(Button('New').click());
  },

  fillInInfo(name) {
    cy.do([
      nameTextField.fillIn(name),
      viewCheckbox.click(),
      saveAUButton.click(),
    ]);
    this.assignAdmin();
  },

  fillInAUInfo: (name) => {
    cy.do([
      nameTextField.fillIn(name),
      viewCheckbox.click(),
      saveAUButton.click(),
    ]);
  },

  assignUser: (userName) => {
    cy.do([
      findUserButton.click(),
      userSearchModal.find(searchTextField).fillIn(userName),
      searchButton.click(),
      userSearchModal.find(firstSearchResult).find(checkboxAll).click(),
      userSearchModal.find(saveButton).click()
    ]);
  },

  assignAdmin: () => {
    cy.do([
      findUserButton.click(),
      userSearchModal.find(searchTextField).fillIn('diku'),
      searchButton.click(),
      firstSearchResult.find(checkboxAll).click(),
      userSearchModal.find(saveButton).click()
    ]);
  },

  unAssignUser: (AUName) => {
    cy.do([
      auListPane.find(Button(AUName)).click(),
      assignedUsersSection.find(MultiColumnListCell({ row: 1, columnIndex: 2 })).find(trashButton).click()
    ]);
  },

  unAssignAdmin: (AUName) => {
    cy.do([
      auListPane.find(Button(AUName)).click(),
      assignedUsersSection.find(MultiColumnListCell({ row: 0, columnIndex: 2 })).find(trashButton).click()
    ]);
  },

  delete: (AUName) => {
    cy.do([
      auListPane.find(Button(AUName)).click(),
      actionsButton.click(),
      Button('Delete').click(),
      Button('Confirm').click()
    ]);
  },

  edit: (AUName) => {
    cy.do(auListPane.find(Button(AUName)).click());
    cy.expect(auPaneDetails.find(assignedUsersSection).exists());
    cy.do([
      actionsButton.click(),
      Button('Edit').click(),
    ]);
  },

  selectViewCheckbox: () => {
    cy.expect(assignedUsersSection.exists());
    cy.do([
      viewCheckbox.click(),
      saveAUButton.click(),
    ]);
    cy.expect(auPaneDetails.find(assignedUsersSection).exists());
  },
};
