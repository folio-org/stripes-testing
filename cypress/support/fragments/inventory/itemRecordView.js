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

const verifyPermanentLocation = location => {
  // TODO: Try to add ID for div.row- for better interaction with KeyValue
  cy.expect(Accordion({ label: 'Location' })
    .find(KeyValue('Effective location for item'))
    .has({ value: location }));
};

export default {
  viewItem,
  verifyItemBarcode,
  verifyPermanentLoanType,
  verifyNote,
  verifyPermanentLocation,

  editItem: (item) => {
    cy.okapiRequest({
      method: 'PUT',
      path: `inventory/items/${item.id}`,
      body: item,
      isDefaultSearchParamsRequired: false,
    });
  },
};
