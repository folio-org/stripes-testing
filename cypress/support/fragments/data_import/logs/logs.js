import { Button, MultiColumnListCell } from '../../../../../interactors';

const quantityRecordsInInvoice = {
  firstQuantity: '18',
};

export default {
  openFileDetails:(fileName) => {
    cy.do(MultiColumnListCell({ row: 0, columnIndex: 0 }).find(Button(fileName)).click());
  },

  checkQuantityRecordsInFile:(quantityRecords) => {
    cy.do(MultiColumnListCell({ row: 0, column: quantityRecords }).exists());
  },

  quantityRecordsInInvoice,
};
