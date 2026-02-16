import {
  HTML,
  Button,
  Pane,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListHeader,
  MultiColumnListRow,
} from '../../../../../interactors';
import FileManager from '../../../utils/fileManager';

const logsPane = Pane('Logs');
const logsLabel = HTML(
  'Logs are available for completed harvests and kept for 30 days. Time in UTC.',
);
const logsList = MultiColumnList();

export default {
  waitLoading() {
    cy.expect([logsPane.exists(), logsList.exists()]);
  },

  verifyLogsPane() {
    cy.expect([logsPane.exists(), logsLabel.exists(), logsList.exists()]);
  },

  verifyLogsTableColumns() {
    cy.expect([
      logsList.find(MultiColumnListHeader('Started')).exists(),
      logsList.find(MultiColumnListHeader('Last update')).exists(),
      logsList.find(MultiColumnListHeader('Harvest Id')).exists(),
      logsList.find(MultiColumnListHeader('', { id: 'list-column-linktoerrorfile' })).exists(),
    ]);
  },

  downloadErrorLog(rowIndex = 0) {
    cy.do(
      logsList
        .find(MultiColumnListRow({ index: rowIndex }))
        .find(MultiColumnListCell({ columnIndex: 3 }))
        .find(Button('Download'))
        .click(),
    );
    cy.wait(3000);
  },

  verifyErrorLogExists(rowIndex = 0) {
    cy.expect(
      logsList
        .find(MultiColumnListRow({ index: rowIndex }))
        .find(MultiColumnListCell({ columnIndex: 3 }))
        .find(Button('Download'))
        .exists(),
    );
  },

  getLogsCount() {
    return cy.then(() => logsList.rowCount());
  },

  verifyErrorLogFileContent(expectedErrors, expectedInstanceId) {
    FileManager.convertCsvToJson('*-error.csv').then((jsonContent) => {
      // Verify array length equals expected errors count
      expect(
        jsonContent,
        `Error log should contain exactly ${expectedErrors.length} errors (one for each deleted resource)`,
      ).to.have.length(expectedErrors.length);

      // UUID pattern regex
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      // Verify each error entry
      jsonContent.forEach((error) => {
        // Verify Request ID matches UUID pattern
        expect(error['Request ID'], 'Request ID should be a valid UUID').to.match(uuidPattern);

        // Verify Instance ID matches test instance
        expect(
          error['Instance ID'],
          'Instance ID in error log should match the test instance',
        ).to.equal(expectedInstanceId);
      });

      // Verify specific error messages with IDs
      const errorMessages = jsonContent.map((error) => error['Error message']);

      expectedErrors.forEach((expectedMessage) => {
        // eslint-disable-next-line no-unused-expressions
        expect(
          errorMessages.some((msg) => msg.includes(expectedMessage)),
          `Error log should contain message with: "${expectedMessage}"`,
        ).to.be.true;
      });
    });
  },
};
