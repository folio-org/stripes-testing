import TopMenu from '../topMenu';
import { TextField, Button, Modal, KeyValue, Pane, MultiColumnList, including, HTML, MultiColumnListRow, Form, TextArea, Heading } from '../../../../interactors';

export default {
  checkOutItem(userBarcode, itemBarcode) {
    cy.do(TextField({ name: 'patron.identifier' }).fillIn(userBarcode));
    cy.intercept('/circulation/requests?*').as('getRequests');
    cy.do(Button({ id: 'clickable-find-patron' }).click());
    cy.expect(KeyValue('Borrower').exists());
    cy.wait('@getRequests');
    cy.do(TextField({ name: 'item.barcode' }).fillIn(itemBarcode));
    cy.wait('@getRequests');
    cy.do(Button({ id: 'clickable-add-item' }).click());
  },
  
  override() {
     if (cy.do(Heading('Item not checked out').exists())) {
      cy.do([
        Button('Override').click(),
        Form({ id: 'override-form' })
          .find(TextArea({ id: 'textarea-input-10' }))
          .fillIn('Test_comment'),
        Button('Save & close').click(),
      ]);
    }
  }
  endCheckOutSession:() => {
    cy.do(Button('End session').click());
  },

  checkIsInterfacesOpened:() => {
    cy.expect(Pane('Scan patron card').exists());
    cy.expect(Pane('Scan items').exists());
  },

  checkPatronInformation:() => {
    cy.expect(KeyValue('Borrower').exists());
    cy.expect(KeyValue('Status').exists());
  },

  checkConfirmMultipieceCheckOut:() => {
    cy.expect(Modal('Confirm multipiece check out').absent());
  },

  checkItemstatus:(barcode) => {
    cy.expect(MultiColumnList({ id:'list-items-checked-out' }).find(HTML(including(barcode))).absent());
  }
};
