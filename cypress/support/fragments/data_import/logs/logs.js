import {
  Button,
  MultiColumnListCell,
  Accordion,
  Selection,
  SelectionList,
  Link
} from '../../../../../interactors';

const quantityRecordsInInvoice = {
  firstQuantity: '18',
};

export default {
  checkImportFile(jobProfileName) {
    cy.do(Button('Actions').click());
    cy.do(Button('View all').click());
    cy.do([
      Accordion({ id: 'profileIdAny' }).clickHeader(),
      Accordion({ id: 'profileIdAny' }).find(Selection({ singleValue: 'Choose job profile' })).open(),
      SelectionList().select(jobProfileName)
    ]);
    cy.expect(MultiColumnListCell(jobProfileName).exists());
  },

  checkStatusOfJobProfile:() => {
    cy.do(MultiColumnListCell({ row: 0, content: 'Completed' }).exists());
  },

  openFileDetails:(fileName) => {
    cy.do(Link(fileName).click());
  },

  checkQuantityRecordsInFile:(quantityRecords) => {
    cy.do(MultiColumnListCell({ row: 0, content: quantityRecords }).exists());
  },

  quantityRecordsInInvoice,
};
