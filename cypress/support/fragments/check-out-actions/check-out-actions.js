import TopMenu from '../topMenu';
import { TextField, Button, Modal, KeyValue, MultiColumnListRow, Form, TextArea, Heading } from '../../../../interactors';

export default {
  checkOutItem(userBarcode, itemBarcode) {
    cy.visit(TopMenu.checkOutPath);
    cy.do([
      TextField({ name: 'patron.identifier' }).fillIn(userBarcode),
      Button({ id: 'clickable-find-patron' }).click(),
    ]);
    cy.expect(KeyValue('Borrower').exists());
    cy.do([
      TextField({ name: 'item.barcode' }).fillIn(itemBarcode),
      Button({ id: 'clickable-add-item' }).click(),
    ]);
    if (cy.do(Heading('Item not checked out').exists())) {
      cy.do([
        Button('Override').click(),
        Form({ id: 'override-form' })
          .find(TextArea({ id: 'textarea-input-10' }))
          .fillIn('Test_comment'),
        Button('Save & close').click(),
      ]);
    }
    cy.do([
      Button('End session').click()
    ]);
    cy.expect(MultiColumnListRow().exists());
  }
};
