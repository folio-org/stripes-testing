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
import { columnNames } from './dataExportViewAllLogs';

const jobsPane = Pane('Jobs');
const logsPane = Pane('Logs');
const logsList = logsPane.find(MultiColumnList({ id: 'job-logs-list' }));
const fileButton = Button('or choose file');
const areYouSureModal = Modal('Are you sure you want to run this job?');
const viewAllLogsButton = Button('View all');
const runningAccordion = Accordion('Running');

const columnNameToIndex = {
  [columnNames.FILE_NAME]: 1,
  [columnNames.STATUS]: 2,
  [columnNames.TOTAL]: 3,
  [columnNames.EXPORTED]: 4,
  [columnNames.FAILED]: 5,
  [columnNames.JOB_PROFILE]: 6,
  [columnNames.STARTED_RUNNING]: 7,
  [columnNames.ENDED_RUNNING]: 8,
  [columnNames.RUN_BY]: 9,
  [columnNames.ID]: 10,
};

const getColumnBackgroundImage = (columnName, callback) => {
  const columnIdMap = {
    'file name': 'filename',
    status: 'status',
    total: 'totalrecords',
    exported: 'exported',
    failed: 'errors',
    'started running': 'starteddate',
    'ended running': 'completeddate',
    'job profile': 'jobprofilename',
    'run by': 'runby',
    id: 'hrid',
  };

  const columnId = `list-column-${columnIdMap[columnName.toLowerCase()] || columnName.toLowerCase().replace(/\s+/g, '')}`;

  cy.get(`#${columnId}`)
    .find('[class^="mclHeaderInner-"]')
    .should(($el) => {
      const afterStyles = window.getComputedStyle($el[0], '::after');
      const backgroundImage = afterStyles.getPropertyValue('background-image');
      callback(backgroundImage);
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

    const columnIndex = columnNameToIndex[columnName];
    if (!columnIndex) {
      throw new Error(`Unknown column name: ${columnName}`);
    }

    const selector = `#job-logs-list [data-row-index] [class^="mclCell-"]:nth-child(${columnIndex})`;

    cy.get(selector).then(($elements) => {
      const textValues = Array.from($elements).map((el) => el.textContent.trim());

      const sortedValues = [...textValues].sort((a, b) => {
        // Handle date columns
        if (
          columnName === columnNames.STARTED_RUNNING ||
          columnName === columnNames.ENDED_RUNNING
        ) {
          const dateA = new Date(a);
          const dateB = new Date(b);
          return sortDirection === 'ascending' ? dateA - dateB : dateB - dateA;
        }
        // Handle numeric columns
        if (
          columnName === columnNames.TOTAL ||
          columnName === columnNames.EXPORTED ||
          columnName === columnNames.FAILED ||
          columnName === columnNames.ID
        ) {
          const numA = parseInt(a, 10) || 0;
          const numB = parseInt(b, 10) || 0;
          return sortDirection === 'ascending' ? numA - numB : numB - numA;
        }
        // Handle text columns - match backend sorting: convert to uppercase then compare
        const valueA = a.toUpperCase();
        const valueB = b.toUpperCase();

        if (sortDirection === 'ascending') {
          return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
        } else {
          return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
        }
      });

      expect(textValues).to.deep.equal(
        sortedValues,
        `${columnName} should be sorted in ${sortDirection} order`,
      );
    });
  },

  verifyColumnSortIcon(columnName, isExist, sortDirection = null) {
    getColumnBackgroundImage(columnName, (backgroundImage) => {
      if (!isExist) {
        expect(backgroundImage, `Column "${columnName}" should not have a sort icon`).to.be.oneOf([
          'none',
          '',
        ]);
      } else {
        const descendingPathFragment = 'M7%2011.1L1.23%204.18';
        const ascendingPathFragment = 'M7%202.9l5.77%206.92';
        const expectedPathFragment =
          sortDirection === 'descending' ? descendingPathFragment : ascendingPathFragment;

        expect(
          backgroundImage,
          `Column "${columnName}" should have ${sortDirection} sort icon`,
        ).to.include(expectedPathFragment);
      }
    });
  },

  verifyColumnUpDownIcon(columnName, isExist = true) {
    const upArrowPathFragment = 'M7%202.9l5.77%206.92';
    const downArrowPathFragment = 'M7%2011.1L1.23%204.18';

    getColumnBackgroundImage(columnName, (backgroundImage) => {
      if (isExist) {
        expect(
          backgroundImage,
          `Column "${columnName}" should have up arrow in UpDown icon`,
        ).to.include(upArrowPathFragment);
        expect(
          backgroundImage,
          `Column "${columnName}" should have down arrow in UpDown icon`,
        ).to.include(downArrowPathFragment);
      } else {
        const hasUpDown =
          backgroundImage.includes(upArrowPathFragment) &&
          backgroundImage.includes(downArrowPathFragment);

        expect(hasUpDown, `Column "${columnName}" should not have an UpDown icon`).to.equal(false);
      }
    });
  },

  scrollTo(direction) {
    cy.get('div[class*="mclScrollable-"]').scrollTo(direction);
  },
};
