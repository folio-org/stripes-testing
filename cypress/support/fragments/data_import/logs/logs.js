import {
  Button,
  MultiColumnListCell,
  Accordion,
  Selection,
  SelectionList,
  Link,
  MultiColumnList,
  HTML,
  MultiColumnListRow,
  Checkbox
} from '../../../../../interactors';

const anyProfileAccordion = Accordion({ id: 'profileIdAny' });
const actionsButton = Button('Actions');
const viewAllLogsButton = Button('View all logs');
const selectAllCheckbox = Checkbox({ name: 'selected-all' });

const quantityRecordsInInvoice = {
  firstQuantity: '18',
};

const actionsButtonClick = () => { cy.do(actionsButton.click()); };
const openViewAllLogs = () => { cy.do(viewAllLogsButton.click()); };
const selectAllLogs = () => { cy.do(MultiColumnList({ id:'job-logs-list' }).find(selectAllCheckbox).click()); };
const deleteAllLogsClick = () => { cy.do(Button('Delete selected logs').click()); };

export default {
  actionsButtonClick,
  openViewAllLogs,
  selectAllLogs,
  deleteAllLogsButtonClick: deleteAllLogsClick,

  checkImportFile(jobProfileName) {
    cy.do(actionsButton.click());
    cy.do(viewAllLogsButton.click());
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

  checkAuthorityLogJSON: (propertiesArray) => {
    cy.do(Button('Authority').click());

    propertiesArray.forEach(property => {
      cy.expect(HTML(property).exists());
    });
  },
  
  getCreatedItemsID: (rowIndex = 0) => cy.then(() =>
    MultiColumnList({ id: 'search-results-list' })
      .find(MultiColumnListRow({ indexRow: `row-${rowIndex}` }))
      .find(Link('Created')).href()),
};
