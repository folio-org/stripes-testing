import { Button, MultiColumnListCell, Accordion, Selection, SelectionList } from '../../../../../interactors';

const quantityRecordsInInvoice = {
  firstQuantity: '18',
};

export default {
  checkImportFile(jobProfileName) {
    cy.do(Button('View all').click());
    cy.do([
      Accordion({ id: 'profileIdAny' }).clickHeader(),
      Selection({ value: 'Choose job profile' }).open(),
      SelectionList().select(jobProfileName)
    ]);
    cy.expect(MultiColumnListCell(jobProfileName).exists());
  },

  checkStatusOfJobProfile:() => {
    cy.do(MultiColumnListCell({ row: 0, column: 'Completed' }).exists());
  },

  openFileDetails:(fileName) => {
    cy.do(MultiColumnListCell({ row: 0, columnIndex: 0 }).find(Button(fileName)).click());
  },

  checkQuantityRecordsInFile:(quantityRecords) => {
    cy.do(MultiColumnListCell({ row: 0, column: quantityRecords }).exists());
  },

  quantityRecordsInInvoice,
};
