import {
  Accordion,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListHeader,
  Button,
  Pane,
  Modal,
  HTML,
  including,
  matching,
} from '../../../../interactors';

const jobsPane = Pane('Jobs');
const logsPane = Pane('Logs');
const logsList = logsPane.find(MultiColumnList({ id: 'job-logs-list' }));
const fileButton = Button('or choose file');
const areYouSureModal = Modal('Are you sure you want to run this job?');
const viewAllLogsButton = Button('View all');
const runningAccordion = Accordion('Running');

const verifyTextColumnSorted = (selector, sortOrder, columnName) => {
  cy.get(selector).then(($elements) => {
    const textValues = Array.from($elements).map((el) => el.textContent.trim());

    const sortedValues = [...textValues].sort((a, b) => {
      if (sortOrder === 'ascending') {
        return a.localeCompare(b, undefined, { sensitivity: 'base' });
      } else {
        return b.localeCompare(a, undefined, { sensitivity: 'base' });
      }
    });

    expect(textValues).to.deep.equal(
      sortedValues,
      `${columnName} should be sorted in ${sortOrder} order`,
    );
  });
};

export default {
  waitLoading: () => {
    cy.expect([jobsPane.exists(), logsPane.exists()]);
  },

  clickButtonWithText: (name) => {
    // We have to manually reload the page on, since cypress waits for it, but we have a single-page application
    cy.window()
      .document()
      .then((doc) => {
        doc.addEventListener('click', () => {
          setTimeout(() => {
            doc.location.reload();
          }, 3000);
        });
        cy.get('[class^=downloadFile---]').contains(name).click();
      });
  },

  clickFileNameFromTheList(fileName) {
    cy.do(MultiColumnListCell({ content: including(fileName) }).click());
  },

  verifyRecordsFoundSubtitleExists() {
    cy.expect(logsPane.has({ subtitle: matching(/\d+ records? found/) }));
  },

  verifyFoundRecordsCount(count) {
    const recordText = count === 1 ? 'record' : 'records';

    cy.expect(logsPane.has({ subtitle: including(`${count} ${recordText} found`) }));
  },

  saveMarcFileForImport: () => {
    cy.do(MultiColumnListCell({ row: 0, columnIndex: 0 }).find(Button()).click());
  },

  verifyAreYouSureModalAbsent() {
    cy.expect(areYouSureModal.absent());
  },

  verifyErrorTextInErrorLogsPane(errorText) {
    cy.get('[class^=errorLogsContainer]').contains(errorText);
  },

  verifyTotalErrorLinesCount(expectedCount) {
    cy.get('div [data-test-error-log=true]').should('have.length', expectedCount);
  },

  verifyViewAllLogsButtonEnabled() {
    cy.expect(viewAllLogsButton.has({ disabled: false }));
  },

  verifyRunningAccordionExpanded() {
    cy.expect(runningAccordion.has({ open: true }));
  },

  verifyDragAndDropAreaExists() {
    cy.get('[data-testid="fileUploader-input"]').should('exist');
    cy.expect(jobsPane.find(HTML('Drag and drop')).exists());
    cy.expect(jobsPane.find(HTML('Select a file with records IDs or CQL queries')).exists());
  },

  verifyUploadFileButtonDisabled(isDisabled = true) {
    cy.expect(fileButton.has({ disabled: isDisabled }));
  },

  verifyFileNameHighlightedInBlue(fileName) {
    cy.get('#job-logs-list [class^=downloadFile-]')
      .contains(fileName)
      .should('have.css', 'color', 'rgb(47, 96, 159)');
  },

  verifyJobAbsentInLogs(fileName) {
    cy.expect(MultiColumnListCell({ content: including(fileName) }).absent());
  },

  clickColumnHeader(columnName) {
    cy.do(MultiColumnListHeader(columnName).click());
    cy.wait(3000);
  },

  verifyColumnSorted(columnName, sortDirection) {
    cy.expect(logsList.find(MultiColumnListHeader(columnName, { sort: sortDirection })).exists());

    verifyTextColumnSorted(
      '#job-logs-list [data-row-index] [class^="mclCell-"]:nth-child(2)',
      sortDirection,
      columnName,
    );
  },
};
