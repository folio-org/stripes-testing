import { Accordion, KeyValue } from '../../../../interactors';

const viewItem = (locator, cellContent) => {
  cy.do(Accordion(`Holdings: ${locator} >`).clickHeader());
  cy.get('[id^="list-items"]').contains(cellContent).click();
};

const verifyItemBarcode = value => {
  cy.expect(KeyValue('Item barcode').has({ value }));
};

const verifyPermanentLoanType = value => {
  cy.expect(KeyValue('Permanent loan type').has({ value }));
};

const verifyNote = value => {
  cy.expect(KeyValue('Check in note').has({ value }));
};

export default {
  viewItem,
  verifyItemBarcode,
  verifyPermanentLoanType,
  verifyNote,
};
