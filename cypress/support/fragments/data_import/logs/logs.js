import { HTML, including } from '@interactors/html';
import {
  Button,
  MultiColumnListCell,
  Accordion,
  Selection,
  SelectionList,
  MultiColumnList,
  MultiColumnListRow,
  Checkbox,
  Link,
} from '../../../../../interactors';

const anyProfileAccordion = Accordion({ id: 'profileIdAny' });
const actionsButton = Button('Actions');
const viewAllLogsButton = Button('View all logs');
const selectAllCheckbox = Checkbox({ name: 'selected-all' });
const searchResultList = MultiColumnList({ id: 'search-results-list' });
const deleteSelectedLogsButton = Button('Delete selected logs');

const quantityRecordsInInvoice = {
  firstQuantity: '18',
};

const actionsButtonClick = () => cy.do(actionsButton.click());
const viewAllLogsButtonClick = () => cy.do(viewAllLogsButton.click());
const selectAllLogs = () => cy.do(MultiColumnList({ id: 'job-logs-list' }).find(selectAllCheckbox).click());
const deleteLogsButtonClick = () => cy.do(deleteSelectedLogsButton.click());

export default {
  quantityRecordsInInvoice,
  actionsButtonClick,
  viewAllLogsButtonClick,
  selectAllLogs,
  deleteLogsButtonClick,

  openViewAllLogs: () => {
    actionsButtonClick();
    viewAllLogsButtonClick();
  },

  checkImportFile(jobProfileName) {
    cy.do(actionsButton.click());
    cy.do(viewAllLogsButton.click());
    cy.do([
      anyProfileAccordion.clickHeader(),
      anyProfileAccordion.find(Selection({ singleValue: 'Choose job profile' })).open(),
    ]);
    cy.do(SelectionList().select(jobProfileName));
    cy.expect(MultiColumnListCell(jobProfileName).exists());
  },

  checkStatusOfJobProfile: (status = 'Completed') => cy.do(MultiColumnListCell({ row: 0, content: status }).exists()),
  openFileDetails: (fileName) => {
    cy.do(Link(fileName).click());
    // TODO need to wait until page is uploaded
    cy.wait(3500);
  },
  checkQuantityRecordsInFile: (quantityRecords) => cy.do(MultiColumnListCell({ row: 0, content: quantityRecords }).exists()),

  clickOnHotLink: (row = 0, columnIndex = 3, status = 'Created') => {
    cy.do(
      searchResultList.find(MultiColumnListCell({ row, columnIndex })).find(Link(status)).click(),
    );
  },

  verifyInstanceStatus: (row = 0, columnIndex = 3, status = 'Created') => {
    cy.do(
      searchResultList.find(MultiColumnListCell({ row, columnIndex, content: status })).exists(),
    );
  },

  goToTitleLink: (title) => {
    // When you click on a link, it opens in a new tab. Because of this, a direct transition to the link is carried out.
    cy.do(
      searchResultList.find(Link(title)).perform((element) => {
        cy.visit(element.href);
      }),
    );
  },

  checkAuthorityLogJSON: (propertiesArray) => {
    cy.do(Button('Authority').click());

    propertiesArray.forEach((property) => {
      cy.expect(HTML(property).exists());
    });
  },

  getCreatedItemsID: (rowIndex = 0) => cy.then(() => searchResultList
    .find(MultiColumnListRow({ indexRow: `row-${rowIndex}` }))
    .find(Link('Created'))
    .href()),

  checkFileIsRunning: (fileName) => cy.expect(
    Accordion('Running')
      .find(HTML(including(fileName)))
      .exists(),
  ),
  verifyCheckboxForMarkingLogsAbsent: () => cy.expect(MultiColumnList({ id: 'job-logs-list' }).find(selectAllCheckbox).absent()),
  verifyDeleteSelectedLogsButtonAbsent: () => cy.expect(deleteSelectedLogsButton.absent()),
};
