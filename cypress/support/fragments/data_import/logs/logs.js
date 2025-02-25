import { HTML, including } from '@interactors/html';
import {
  Accordion,
  Button,
  Checkbox,
  Link,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
  Selection,
  SelectionList,
} from '../../../../../interactors';
import FileDetails from './fileDetails';

const anyProfileAccordion = Accordion({ id: 'profileIdAny' });
const runningAccordion = Accordion('Running');
const actionsButton = Button('Actions');
const viewAllLogsButton = Button('View all logs');
const selectAllCheckbox = Checkbox({ name: 'selected-all' });
const searchResultList = MultiColumnList({ id: 'search-results-list' });
const deleteSelectedLogsButton = Button('Delete selected logs');
const times = Button({ icon: 'times' });
const visitedLinkColor = 'rgb(47, 96, 159)';

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
    cy.wait(1500);
    actionsButtonClick();
    viewAllLogsButtonClick();
  },

  checkImportFile(jobProfileName) {
    cy.do(actionsButton.click());
    cy.do(viewAllLogsButton.click());
    cy.do([
      anyProfileAccordion.clickHeader(),
      anyProfileAccordion.find(Selection({ value: including('Choose job profile') })).open(),
    ]);
    cy.do(SelectionList().select(jobProfileName));
    cy.expect(MultiColumnListCell(jobProfileName).exists());
  },

  checkStatusOfJobProfile: (status = 'Completed', rowNumber = 0) => cy.do(MultiColumnListCell({ row: rowNumber, content: status }).exists()),

  checkJobStatus: (fileName, status) => {
    const newFileName = fileName.replace(/\.mrc$/i, '');

    cy.do(
      MultiColumnListCell({ content: including(newFileName) }).perform((element) => {
        const rowNumber = element.parentElement.getAttribute('data-row-inner');

        cy.expect(
          MultiColumnList({ id: 'job-logs-list' })
            .find(MultiColumnListRow({ indexRow: `row-${rowNumber}` }))
            .find(MultiColumnListCell({ content: status }))
            .exists(),
        );
      }),
    );
  },
  checkJobStatusByUser: (fileName, username, status) => {
    const newFileName = fileName.replace(/\.mrc$/i, '');
    cy.do(
      MultiColumnListCell({ content: username }).perform((element) => {
        const rowNumber = element.parentElement.getAttribute('data-row-inner');

        cy.expect(
          MultiColumnList({ id: 'job-logs-list' })
            .find(MultiColumnListRow({ indexRow: `row-${rowNumber}` }))
            .find(MultiColumnListCell({ content: including(newFileName) }))
            .exists(),
        );
        cy.expect(
          MultiColumnList({ id: 'job-logs-list' })
            .find(MultiColumnListRow({ indexRow: `row-${rowNumber}` }))
            .find(MultiColumnListCell({ content: status }))
            .exists(),
        );
      }),
    );
  },
  openFileDetailsByRowNumber: (rowNumber = 0) => {
    cy.do(
      MultiColumnList({ id: 'list-data-import' })
        .find(MultiColumnListRow({ indexRow: `row-${rowNumber}` }))
        .find(Link({ href: including('/data-import/job-summary') }))
        .click(),
    );
  },
  openFileDetails: (fileName) => {
    const newFileName = fileName.replace('.mrc', '');

    cy.do(Link(including(newFileName)).click());
    FileDetails.verifyLogDetailsPageIsOpened(newFileName);
    FileDetails.verifyResultsListIsVisible();
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
    cy.do(
      searchResultList.find(Link(title)).perform((element) => {
        // Remove target="_blank" attribute so it doesn't open in new tab
        if (element.hasAttribute('target') && element.getAttribute('target') === '_blank') {
          element.removeAttribute('target');
        }
        element.click();
      }),
    );
  },

  checkAuthorityLogJSON: (propertiesArray) => {
    cy.do(Button('Authority').click());
    cy.wait(1500);
    propertiesArray.forEach((property) => {
      cy.expect(HTML(property).exists());
    });
  },

  getCreatedItemsID: (rowIndex = 0) => cy.then(() => searchResultList
    .find(MultiColumnListRow({ indexRow: `row-${rowIndex}` }))
    .find(Link('Created'))
    .href()),

  getCreatedItemID(rowIndex = 0) {
    return cy.then(() => {
      searchResultList
        .find(MultiColumnListRow({ indexRow: `row-${rowIndex}` }))
        .find(Link('Created'))
        .href()
        .then((link) => {
          return cy.wrap(
            link.substring(link.indexOf('/inventory/view/') + '/inventory/view/'.length),
          );
        });
    });
  },

  checkFileIsRunning: (fileName) => {
    cy.wait(1500);
    cy.expect(runningAccordion.find(HTML(including(fileName))).exists());
  },
  verifyCheckboxForMarkingLogsAbsent: () => cy.expect(MultiColumnList({ id: 'job-logs-list' }).find(selectAllCheckbox).absent()),
  verifyDeleteSelectedLogsButtonAbsent: () => cy.expect(deleteSelectedLogsButton.absent()),
  closePane: () => {
    cy.do(times.click());
  },

  verifyFirstFileNameStyle: () => {
    cy.get('#job-logs-list [class*="mclCell-"]:nth-child(1) a')
      .eq(0)
      .should('have.css', 'text-decoration')
      .and('include', 'underline');
  },

  verifyNoFileNameLogAbsent: () => {
    cy.do(
      MultiColumnList({ id: 'job-logs-list' })
        .find(MultiColumnListCell({ row: 0, columnIndex: 0, content: 'No file name' }))
        .absent(),
    );
  },

  verifyFirstFileNameInLogList: (username, fileName) => {
    const newFileName = fileName.replace(/\.mrc$/i, '');
    cy.do(
      MultiColumnListCell({ content: username }).perform((element) => {
        const rowNumber = element.parentElement.getAttribute('data-row-inner');

        cy.expect(
          MultiColumnList({ id: 'job-logs-list' })
            .find(MultiColumnListRow({ indexRow: `row-${rowNumber}` }))
            .find(MultiColumnListCell({ content: including(newFileName) }))
            .exists(),
        );
      }),
    );
  },

  clickFirstFileNameCell: () => {
    cy.do(
      MultiColumnList({ id: 'job-logs-list' })
        .find(MultiColumnListCell({ row: 0, columnIndex: 0 }))
        .hrefClick(),
    );
  },

  verifyVisitedLinkColor: () => {
    cy.get('#job-logs-list [class*="mclCell-"]:nth-child(1) a')
      .eq(0)
      .should('have.css', 'color', visitedLinkColor);
  },

  waitFileIsImported: (fileName) => {
    const newFileName = fileName.replace(/\.mrc$/i, '');

    cy.expect(
      MultiColumnList({ id: 'job-logs-list' })
        .find(Button(including(newFileName)))
        .exists(),
    );
  },

  getCreatedItemsTitle: (rowIndex = 0) => cy.then(() => searchResultList
    .find(MultiColumnListRow({ indexRow: `row-${rowIndex}` }))
    .find(Link({ href: including('/data-import/log/') }))
    .text()),
};
