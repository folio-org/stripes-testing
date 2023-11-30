import { HTML } from '@interactors/html';
import { Button, TextField, Modal, MultiColumnListCell } from '../../../../interactors';

const changeDueDateModal = Modal('Change due date');

export default {
  fillDate(dateString) {
    // dateString format MM/DD/YYYY
    cy.do(TextField('Date').fillIn(dateString));
    // wait is necessary because TextField fills very quickly
    cy.wait(1000);
  },
  verifyWarning(textString) {
    cy.expect(HTML(textString).exists());
  },
  verifyChangeDueDateForm(data) {
    cy.expect([
      changeDueDateModal.exists(),
      changeDueDateModal
        .find(MultiColumnListCell({ column: 'Title' }))
        .has({ content: data.title }),
      changeDueDateModal
        .find(MultiColumnListCell({ column: 'Item status' }))
        .has({ content: data.itemStatus }),
      changeDueDateModal
        .find(MultiColumnListCell({ column: 'Barcode' }))
        .has({ content: data.itemBarcode }),
    ]);
  },
  saveAndClose() {
    cy.do([Modal().find(Button('Save and close')).click(), Modal().find(Button('Close')).click()]);
  },
  verifyRequestsCount(contentValue) {
    cy.expect(MultiColumnListCell({ content: contentValue }).exists());
  },
};
