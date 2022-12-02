import { Button, QuickMarcEditorRow, Modal } from '../../../../interactors';

const deleteFieldsModal = Modal('Delete fields');

export default {
  deleteField:() => {
    // need to wait untill the row will be uploaded
    cy.wait(1500);
    cy.do(QuickMarcEditorRow({ dataRow: 'record-row[29]' }).find(Button({ icon: 'trash' })).click());
    cy.do(Button('Save & close').click());
    cy.do(deleteFieldsModal.find(Button({ id: 'clickable-quick-marc-confirm-modal-confirm' })).click());
    cy.expect(deleteFieldsModal.absent());
  }
};
