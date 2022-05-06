import { Button, TextField, Pane, Select, HTML, including } from '../../../../interactors';
import { getLongDelay } from '../../utils/cypressTools';

const actionsButton = Button('Actions');
const newRequestButton = Button('New');
const itemBarcodeInput = TextField({ name: 'item.barcode' });
const requesterBarcodeInput = TextField({ name: 'requester.barcode' });
const enterItemBarcodeButton = Button({ id: 'clickable-select-item' });
const enterRequesterBarcodeButton = Button({ id: 'clickable-select-requester' });
const saveAndCloseButton = Button({ id: 'clickable-save-request' });

export default {
  openNewRequestPane() {
    cy.intercept('/cancellation-reason-storage/cancellation-reasons').as('getReasons');
    cy.do([
      actionsButton.click(),
      newRequestButton.click()
    ]);
    cy.wait('@getReasons');
  },

  fillRequiredFields(newRequest) {
    cy.do(requesterBarcodeInput.fillIn(newRequest.requesterBarcode));
    cy.intercept('/proxiesfor?*').as('getUsers');
    cy.do(enterRequesterBarcodeButton.click());
    cy.expect(Select({ name:'pickupServicePointId' }).exists);
    cy.wait('@getUsers');
    cy.do(itemBarcodeInput.fillIn(newRequest.itemBarcode));
    cy.intercept('/circulation/loans?*').as('getLoans');
    cy.do(enterItemBarcodeButton.click());
    cy.wait('@getLoans');
    cy.wait(1500);
  },

  choosepickupServicePoint(pickupServicePoint) {
    cy.intercept('/inventory/items?*').as('getItems');
    cy.wait('@getItems', getLongDelay());
    cy.wait(1500);
    cy.do(Select({ name:'pickupServicePointId' }).choose(pickupServicePoint));
    cy.wait('@getItems');
    cy.expect(HTML(including(pickupServicePoint)).exists());
  },

  saveRequestAndClose() {
    cy.do(saveAndCloseButton.click());
  },

  waitLoading() {
    cy.expect(Pane({ title: 'Request Detail' }).exists());
  },

  createNewRequest(newRequest) {
    this.openNewRequestPane();
    this.fillRequiredFields(newRequest);
    this.choosepickupServicePoint(newRequest.pickupServicePoint);
    this.saveRequestAndClose();
    this.waitLoading();
  }
};
