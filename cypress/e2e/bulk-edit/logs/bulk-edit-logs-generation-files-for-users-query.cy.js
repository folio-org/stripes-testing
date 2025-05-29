import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import QueryModal, {
  QUERY_OPERATIONS,
  usersFieldValues,
} from '../../../support/fragments/bulk-edit/query-modal';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import FileManager from '../../../support/utils/fileManager';

let user;
let userForBuildQuery;
let numberOfRecordsAfterRunQuery;

describe('Bulk-edit', () => {
  describe('Logs', () => {
    before('create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        permissions.bulkEditUpdateRecords.gui,
        permissions.uiUserEdit.gui,
        permissions.bulkEditQueryView.gui,
      ]).then((userProperties) => {
        userForBuildQuery = userProperties;
      });
      cy.createTempUser([
        permissions.bulkEditUpdateRecords.gui,
        permissions.uiUserEdit.gui,
        permissions.bulkEditLogsView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(userForBuildQuery.username, userForBuildQuery.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.clickBuildQueryButton();
        QueryModal.verify();
        QueryModal.selectField(usersFieldValues.userId);
        QueryModal.verifySelectedField(usersFieldValues.userId);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.fillInValueTextfield(user.userId);
        cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
        QueryModal.clickTestQuery();
        QueryModal.clickRunQuery();
        QueryModal.verifyClosed();
        BulkEditSearchPane.matchedAccordionIsAbsent(false);
        BulkEditSearchPane.getNumberMatchedRecordsFromPaneHeader().then((numberOfRecords) => {
          numberOfRecordsAfterRunQuery = numberOfRecords;
        });
        cy.wait('@getPreview').then((interception) => {
          const interceptedUuid = interception.request.url.match(
            /bulk-operations\/([a-f0-9-]+)\/preview/,
          )[1];
          const identifiersQueryFilename = `*Query-${interceptedUuid}.csv`;
          cy.wrap(identifiersQueryFilename).as('identifiersQueryFilename');
          const matchedRecordsFileName = `*-Matched-Records-Query-${interceptedUuid}.csv`;
          cy.wrap(matchedRecordsFileName).as('matchedRecordsFileName');
        });

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.openLogsSearch();
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      Users.deleteViaApi(userForBuildQuery.userId);
    });

    it(
      'C436916 Verify generated Logs files for Users (Query) (firebird)',
      { tags: ['criticalPath', 'firebird', 'C436916'] },
      () => {
        BulkEditLogs.checkUsersCheckbox();
        BulkEditLogs.verifyLogStatus(userForBuildQuery.username, 'Data modification');
        BulkEditLogs.verifyLogStatus(userForBuildQuery.username, 'Query');
        BulkEditLogs.clickActionsRunBy(userForBuildQuery.username);
        BulkEditLogs.verifyLogsRowActionWhenRunQuery();
        BulkEditLogs.downloadQueryIdentifiers();
        cy.get('@identifiersQueryFilename').then((fileName) => {
          ExportFile.verifyFileIncludes(fileName, [user.userId]);
          BulkEditFiles.verifyCSVFileRecordsNumber(fileName, numberOfRecordsAfterRunQuery);
          FileManager.deleteFileFromDownloadsByMask(fileName);
        });

        BulkEditLogs.downloadFileWithMatchingRecords();
        cy.get('@matchedRecordsFileName').then((fileName) => {
          ExportFile.verifyFileIncludes(fileName, [user.userId]);
          BulkEditFiles.verifyCSVFileRowsRecordsNumber(fileName, numberOfRecordsAfterRunQuery);
          FileManager.deleteFileFromDownloadsByMask(fileName);
        });
      },
    );
  });
});
