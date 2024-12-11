import { including } from '@interactors/html';
import { Button, Modal, MultiColumnListRow, Pane, TextField } from '../../../../../../interactors';

const urlRelationshipPane = Pane('URL relationship');
const newButton = Button('+ New');
const nameTextfield = TextField('Name 0');
const saveButton = Button('Save');
const deleteIcon = Button({ icon: 'trash' });
const deleteButton = Button('Delete');
const deleteUrlRelationshipModal = Modal('Delete URL relationship term');

export default {
  waitloading() {
    cy.expect(urlRelationshipPane.exists());
  },

  clickNewButton() {
    cy.do(newButton.click());
  },

  fillInName(name) {
    cy.do(nameTextfield.fillIn(name));
  },

  clickSaveButton() {
    cy.do(saveButton.click());
  },

  createNewRelationship(name) {
    this.clickNewButton();
    this.fillInName(name);
    this.clickSaveButton();
  },

  verifyElectronicAccessNameOnTable(name) {
    cy.expect(MultiColumnListRow(including(name)).exists());
  },

  deleteUrlRelationship(name) {
    cy.do([
      MultiColumnListRow(including(name)).find(deleteIcon).click(),
      deleteUrlRelationshipModal.find(deleteButton).click(),
    ]);
  },
};
