import { TextField, Pane, Button, MultiColumnListRow, including, HTML, KeyValue } from '../../../../interactors';

const itemDetailsButton = Button('Item details');
const enterButton = Button('Enter');

export default {
  checkOutItem:(userBarcode, itemBarcode) => {
    cy.intercept('/groups').as('getGroups');
    cy.do(TextField({ name:'patron.identifier' }).fillIn(userBarcode));
    cy.wait('@getGroups');
    cy.intercept('/circulation/requests?*').as('getRequests');
    cy.do(Pane('Scan patron card').find(enterButton).click());
    cy.expect(KeyValue('Borrower').exists());
    cy.wait('@getRequests');
    cy.do(TextField({ name:'item.barcode' }).fillIn(itemBarcode));
    cy.wait('@getRequests');
    cy.do(Pane('Scan items').find(enterButton).click());
    cy.wait('@getRequests');
  },
  openItemRecordInInventory:(barcode) => {
    cy.expect(MultiColumnListRow({ indexRow: 'row-0' }).find(HTML(including(barcode))).exists());
    cy.do(Button({ id: 'available-item-actions-button' }).click());
    cy.expect(itemDetailsButton.exists());
    cy.do(itemDetailsButton.click());
  },
};
