import { Button, QuickMarcEditorRow, Modal, Pane, TextField, TextArea } from '../../../../interactors';

const deleteFieldsModal = Modal('Delete fields');

const saveAndClose = () => {
  cy.do(Button('Save & close').click());
};

export default {
  saveAndClose,
  deleteField:() => {
    // need to wait untill the row will be uploaded
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
    cy.do(QuickMarcEditorRow({ dataRow: 'record-row[39]' }).find(Button({ icon: 'plus-sign' })).click());
    cy.do(TextField({ name:'records[40].tag' }).fillIn(fieldNumber));
    cy.do(TextArea({ name:'records[40].content' }).fillIn(fieldData));
  },

  editField:(content, number) => {
    // need to wait untill the row is displayed
    cy.wait(2000);
    cy.do(TextArea({ name:`records[${number}].content` }).fillIn(content));
    // need to wait untill the row will be updated
    cy.wait(2000);
  }
};
