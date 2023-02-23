/* eslint-disable cypress/no-unnecessary-waiting */
import { including } from '@interactors/html';
import { Button, QuickMarcEditorRow, Modal, Pane, TextField, TextArea } from '../../../../interactors';

const deleteFieldsModal = Modal('Delete fields');

const saveAndClose = () => {
  // need to wait until data will be filled in
  cy.wait(1500);
  cy.do(Button('Save & close').click());
};

export default {
  saveAndClose,
  deleteField:() => {
    // need to wait until the row will be uploaded
    cy.wait(1500);
    cy.do(QuickMarcEditorRow({ dataRow: 'record-row[29]' }).find(Button({ icon: 'trash' })).click());
    saveAndClose();
    cy.do(deleteFieldsModal.find(Button({ id: 'clickable-quick-marc-confirm-modal-confirm' })).click());
    cy.expect(deleteFieldsModal.absent());
  },

  checkEditableQuickMarcFormIsOpened:() => {
    cy.expect(Pane({ id:'quick-marc-editor-pane' }).exists());
  },

  addField:(fieldNumber, fieldData) => {
    cy.wait(1500);
    cy.do(QuickMarcEditorRow({ dataRow: 'record-row[39]' }).find(Button({ icon: 'plus-sign' })).click());
    cy.do(TextField({ name:'records[40].tag' }).fillIn(fieldNumber));
    cy.do(TextArea({ name:'records[40].content' }).fillIn(fieldData));
  },

  editField:(content, newContent) => {
    // need to wait until the field will be found
    cy.wait(1000);
    cy.do(TextArea({ textContent:including(content) }).fillIn(newContent));
  }
};
