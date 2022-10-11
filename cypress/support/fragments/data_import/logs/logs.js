import {
  Button,
  MultiColumnListCell,
  Accordion,
  Selection,
  SelectionList,
  Link,
  MultiColumnList,
  HTML,
} from '../../../../../interactors';

const anyProfileAccordion = Accordion({ id: 'profileIdAny' });

const quantityRecordsInInvoice = {
  firstQuantity: '18',
};

export default {
  checkImportFile(jobProfileName) {
    cy.do(Button('Actions').click());
    cy.do(Button('View all logs').click());
    cy.do([
      anyProfileAccordion.clickHeader(),
      anyProfileAccordion.find(Selection({ singleValue: 'Choose job profile' })).open()]);
    cy.do(SelectionList().select(jobProfileName));
    cy.expect(MultiColumnListCell(jobProfileName).exists());
  },

  checkStatusOfJobProfile:(status = 'Completed') => {
    cy.do(MultiColumnListCell({ row: 0, content: status }).exists());
  },

  openFileDetails:(fileName) => {
    cy.do(Link(fileName).click());
  },

  checkQuantityRecordsInFile:(quantityRecords) => {
    cy.do(MultiColumnListCell({ row: 0, content: quantityRecords }).exists());
  },

  clickOnHotLink: (row = 0, columnIndex = 3, status = 'Created') => {
    cy.do(MultiColumnList({ id: 'search-results-list' })
      .find(MultiColumnListCell({ row, columnIndex }))
      .find(Link(status)).click());
  },

  verifyInstanceStatus: (row = 0, columnIndex = 3, status = 'Created') => {
    cy.do(MultiColumnList({ id: 'search-results-list' })
      .find(MultiColumnListCell({ row, columnIndex, content: status }))
      .exists());
  },

  quantityRecordsInInvoice,

  goToTitleLink: (title) => {
    // When you click on a link, it opens in a new tab. Because of this, a direct transition to the link is carried out.
    cy.do(
      MultiColumnList({ id: 'search-results-list' })
        .find(Link(title)).perform(element => {
          cy.visit(element.href);
        })
    );
  },

  checkAuthorityLogJSON: () => {
    cy.do(Button('Authority').click());
    cy.expect([
      HTML('"sourceFileId":').exists(),
      HTML('"af045f2f-e851-4613-984c-4bc13430454a"').exists(),
      HTML('"naturalId":').exists(),
      HTML('"n2015002050"').exists(),
    ]);
  },
};
