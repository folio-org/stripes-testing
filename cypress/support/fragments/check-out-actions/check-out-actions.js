import {
  TextField,
  Button,
  KeyValue,
  Pane,
  Modal,
  MultiColumnList,
  HTML,
  including
} from '../../../../interactors';

const modal = Modal('Confirm multipiece check out');

export default {
  modal,

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

  checkItemstatus:(barcode) => {
    cy.expect(MultiColumnList({ id:'list-items-checked-out' }).find(HTML(including(barcode))).absent());
  }
};
