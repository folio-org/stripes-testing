import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import QueryModal, {
  usersFieldValues,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { tenantNames } from '../../../../support/dictionary/affiliations';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import { BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import { getLongDelay } from '../../../../support/utils/cypressTools';

let user;
let staffUser;
let patronUser;
let testIdentifiers;
let matchedRecordsFileName;
const barcodeStartsWith = String(randomFourDigitNumber());
const externalIdContains = String(randomFourDigitNumber());

describe('Bulk-edit', () => {
  describe('Central tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();

        cy.createTempUser([
          permissions.bulkEditUpdateRecords.gui,
          permissions.uiUsersView.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // Create staff user for testing
          cy.createTempUser([], 'staff').then((staffUserProperties) => {
            staffUser = staffUserProperties;

            // Update staff user with external system ID and barcode for testing
            cy.getUsers({ limit: 1, query: `username=${staffUser.username}` }).then((users) => {
              const externalId = `${getRandomPostfix()}-${externalIdContains}`;
              users[0].barcode = `${barcodeStartsWith}-${getRandomPostfix()}`;
              cy.updateUser({
                ...users[0],
                externalSystemId: externalId,
              }).then(() => {
                staffUser.externalSystemId = externalId;
                staffUser.barcode = users[0].barcode;
              });
            });
          });

          // Create patron user for testing
          cy.createTempUser([], 'faculty', 'patron').then((patronUserProperties) => {
            patronUser = patronUserProperties;

            // Update patron user with external system ID and barcode for testing
            cy.getUsers({ limit: 1, query: `username=${patronUser.username}` }).then((users) => {
              const externalId = `${getRandomPostfix()}-${externalIdContains}`;
              users[0].barcode = `${barcodeStartsWith}-${getRandomPostfix()}`;
              cy.updateUser({
                ...users[0],
                externalSystemId: externalId,
              }).then(() => {
                patronUser.externalSystemId = externalId;
                patronUser.barcode = users[0].barcode;

                // Prepare test identifiers
                testIdentifiers = {
                  userUuids: [staffUser.userId, patronUser.userId].join(','),
                  username: patronUser.username,
                };

                cy.login(user.username, user.password, {
                  path: TopMenu.bulkEditPath,
                  waiter: BulkEditSearchPane.waitLoading,
                });
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
                BulkEditSearchPane.openQuerySearch();
              });
            });
          });
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        Users.deleteViaApi(staffUser.userId);
        Users.deleteViaApi(patronUser.userId);
        FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName);
      });

      it(
        'C503027 Query - Verify "Preview of record matched" when querying by valid Users identifiers in Central tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C503027'] },
        () => {
          // Step 1: Select "Users" radio button and click "Build query" button
          BulkEditSearchPane.checkUsersRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();
          QueryModal.cancelDisabled(false);
          QueryModal.runQueryDisabled();

          // Step 2: Select "User - User UUID" field with "in" operator
          QueryModal.selectField(usersFieldValues.userId);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueTextfield(testIdentifiers.userUuids);
          QueryModal.verifyQueryAreaContent(
            `(users.id in (${testIdentifiers.userUuids.replace(/,/g, ', ')}))`,
          );
          QueryModal.testQueryDisabled(false);

          // Step 3: Click "Test query" button
          QueryModal.testQuery();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfMatchedRecords(2);
          QueryModal.runQueryDisabled(false);

          // Step 4: Click "Run query" button and verify bulk edit query pane
          cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@getPreview', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            matchedRecordsFileName = `*-Matched-Records-Query-${interceptedUuid}.csv`;

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('2 user');
            BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);

            // Step 5: Check matched User records in the table
            BulkEditActions.openActions();
            BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.BARCODE,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              staffUser.userId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.BARCODE,
              staffUser.barcode,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              patronUser.userId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.BARCODE,
              patronUser.barcode,
            );

            // Step 6: Verify Actions menu
            BulkEditSearchPane.verifySearchColumnNameTextFieldExists();
            BulkEditSearchPane.verifyCheckedCheckboxesPresentInTheTable();

            // Step 7: Download matched records CSV
            BulkEditActions.openActions();
            BulkEditActions.downloadMatchedResults();
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              staffUser.userId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.BARCODE,
              staffUser.barcode,
            );
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              patronUser.userId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.BARCODE,
              patronUser.barcode,
            );

            FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName);
          });

          // Step 8-9: Test User - Barcode with "starts with" operator
          BulkEditSearchPane.clickToBulkEditMainButton();
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkUsersRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.selectField(usersFieldValues.userBarcode);
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
          QueryModal.fillInValueTextfield(barcodeStartsWith);
          QueryModal.testQuery();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfMatchedRecords(2);
          QueryModal.runQueryDisabled(false);

          // Step 10-11: Run query and verify results for barcode search
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@getPreview', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            matchedRecordsFileName = `*-Matched-Records-Query-${interceptedUuid}.csv`;

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('2 user');
            BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              staffUser.userId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.BARCODE,
              staffUser.barcode,
            );
            BulkEditActions.downloadMatchedResults();
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              staffUser.userId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.BARCODE,
              staffUser.barcode,
            );

            FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName);
          });

          // Step 12-14: Test User - External system ID with "contains" operator
          BulkEditSearchPane.clickToBulkEditMainButton();
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkUsersRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.selectField(usersFieldValues.externalSystemId);
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);
          QueryModal.fillInValueTextfield(externalIdContains);
          QueryModal.testQuery();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfMatchedRecords(2);
          QueryModal.runQueryDisabled(false);
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@getPreview', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            matchedRecordsFileName = `*-Matched-Records-Query-${interceptedUuid}.csv`;

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('2 user');
            BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              staffUser.userId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.BARCODE,
              staffUser.barcode,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              patronUser.userId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.BARCODE,
              patronUser.barcode,
            );
            BulkEditActions.downloadMatchedResults();
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              staffUser.userId,
              'External system id',
              staffUser.externalSystemId,
            );
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              patronUser.userId,
              'External system id',
              patronUser.externalSystemId,
            );

            FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName);
          });

          // Step 15-16: Test User - Username with "equals" operator
          BulkEditSearchPane.clickToBulkEditMainButton();
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkUsersRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.selectField(usersFieldValues.userName);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(testIdentifiers.username);
          QueryModal.testQuery();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfMatchedRecords(1);
          QueryModal.runQueryDisabled(false);
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@getPreview', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            matchedRecordsFileName = `*-Matched-Records-Query-${interceptedUuid}.csv`;

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('1 user');
            BulkEditSearchPane.verifyPaginatorInMatchedRecords(1);
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              patronUser.userId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USERNAME,
              patronUser.username,
            );

            // Step 17: Download matched records for username search
            BulkEditActions.downloadMatchedResults();
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              patronUser.userId,
              'User name',
              patronUser.username,
            );
          });
        },
      );
    });
  });
});
