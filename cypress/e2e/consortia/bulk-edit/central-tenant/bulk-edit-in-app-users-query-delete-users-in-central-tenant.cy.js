import moment from 'moment';
import uuid from 'uuid';
import permissions from '../../../../support/dictionary/permissions';
import { tenantNames } from '../../../../support/dictionary/affiliations';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import QueryModal, {
  usersFieldValues,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import UsersSearchResultsPane from '../../../../support/fragments/users/usersSearchResultsPane';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import ManualCharges from '../../../../support/fragments/settings/users/manualCharges';
import UsersOwners from '../../../../support/fragments/settings/users/usersOwners';
import NewFeeFine from '../../../../support/fragments/users/newFeeFine';
import FileManager from '../../../../support/utils/fileManager';
import { BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';

let user;
let userToDelete;
let userWithOpenTransaction;
let fileNames;
const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
const ownerData = {};
const feeFineType = {};
let feeFineAccount;

describe('Bulk-edit', () => {
  describe('Central tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();

        // user without open transactions - will be deleted
        cy.createTempUser([]).then((userProperties) => {
          userToDelete = userProperties;
        });

        // user with an open transaction - deletion is expected to fail
        cy.createTempUser([]).then((userProperties) => {
          userWithOpenTransaction = userProperties;

          ServicePoints.createViaApi(servicePoint);
          UsersOwners.createViaApi(UsersOwners.getDefaultNewOwner())
            .then(({ id, owner }) => {
              ownerData.name = owner;
              ownerData.id = id;
            })
            .then(() => {
              ManualCharges.createViaApi({
                ...ManualCharges.defaultFeeFineType,
                ownerId: ownerData.id,
              }).then((manualCharge) => {
                feeFineType.id = manualCharge.id;
                feeFineType.name = manualCharge.feeFineType;
                feeFineType.amount = manualCharge.amount;
              });

              cy.getAdminSourceRecord().then((adminSourceRecord) => {
                feeFineAccount = {
                  id: uuid(),
                  ownerId: ownerData.id,
                  feeFineId: feeFineType.id,
                  amount: 100,
                  userId: userWithOpenTransaction.userId,
                  feeFineType: feeFineType.name,
                  feeFineOwner: ownerData.name,
                  createdAt: servicePoint.id,
                  dateAction: moment.utc().format(),
                  source: adminSourceRecord,
                };
                NewFeeFine.createViaApi(feeFineAccount).then((feeFineAccountId) => {
                  feeFineAccount.id = feeFineAccountId;
                });
              });
            });
        });

        cy.createTempUser([
          permissions.bulkEditUsersDelete.gui,
          permissions.bulkEditLogsView.gui,
          permissions.bulkEditQueryView.gui,
          permissions.uiUsersView.gui,
          permissions.uiUsersDelete.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          BulkEditSearchPane.openQuerySearch();
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        ManualCharges.deleteViaApi(feeFineType.id);
        NewFeeFine.deleteFeeFineAccountViaApi(feeFineAccount.id);
        UsersOwners.deleteViaApi(ownerData.id);
        ServicePoints.deleteViaApi(servicePoint.id);
        Users.deleteViaApi(user.userId);
        // userToDelete is expected to be deleted by the test; ignore errors if already deleted
        Users.deleteViaApi(userToDelete.userId);
        Users.deleteViaApi(userWithOpenTransaction.userId);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C1385650 Verify bulk delete Users in Central tenant (athena)',
        { tags: ['smokeECS', 'athena', 'C1385650'] },
        () => {
          const userUUIDs = `${userToDelete.userId},${userWithOpenTransaction.userId}`;

          // Step 1: Build query on "User - User UUID" field with "in" operator, test and run it
          BulkEditSearchPane.checkUsersRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();
          QueryModal.selectField(usersFieldValues.userId);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueTextfield(userUUIDs);
          QueryModal.verifyQueryAreaContent(`(users.id in (${userUUIDs.replace(/,/g, ', ')}))`);
          QueryModal.testQuery();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfMatchedRecords(2);
          QueryModal.runQueryDisabled(false);

          cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@getPreview').then((interception) => {
            const bulkEditJobId = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            fileNames = BulkEditFiles.getAllQueryDownloadedFileNames(bulkEditJobId, true);

            // Step 2-3: Verify "Bulk edit query" pane and "Preview of records matched"
            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('2 user');
            BulkEditSearchPane.verifyQueryHeadLine(
              `(users.id in (${userUUIDs.replace(/,/g, ', ')}))`,
            );
            BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);

            // Step 4: Verify Actions menu options
            BulkEditActions.openActions();
            BulkEditActions.downloadMatchedRecordsExists();
            BulkEditActions.startBulkDeleteButtonExists();

            // Step 5: Download matched records (CSV)
            BulkEditActions.openActions();
            BulkEditActions.downloadMatchedResults();
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              userToDelete.userId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              userToDelete.userId,
            );
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              userWithOpenTransaction.userId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              userWithOpenTransaction.userId,
            );

            // Step 6: Click "Start bulk delete" and verify the confirmation modal
            BulkEditActions.clickStartBulkDeleteButton();
            BulkEditActions.verifyDeleteUserRecordsModalContent(2, 30);
            BulkEditActions.verifyDeleteUserRecordsModalButtons();

            // Step 7: Click "Cancel" - modal closes, preview is still shown
            BulkEditActions.clickCancelButtonInDeleteUserRecordsModal();
            BulkEditActions.verifyDeleteUserRecordsModalAbsent();
            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('2 user');

            // Step 8: Reopen "Start bulk delete" and click "Delete"
            BulkEditActions.openActions();
            BulkEditActions.clickStartBulkDeleteButton();
            BulkEditActions.verifyDeleteUserRecordsModalButtons();
            BulkEditActions.clickDeleteButtonInDeleteUserRecordsModal();

            // Step 9: Verify confirmation screen
            BulkEditActions.verifyUsersDeletedSuccessfully(2, 1);
            BulkEditSearchPane.verifyQueryHeadLine(
              `(users.id in (${userUUIDs.replace(/,/g, ', ')}))`,
            );
            BulkEditSearchPane.verifyPaneRecordsChangedCount(0);

            // Step 10: Errors & warnings accordion is populated with the not-deleted user
            BulkEditSearchPane.verifyErrorsAccordionIncludesNumberOfIdentifiers(1, [
              userWithOpenTransaction.userId,
            ]);
            BulkEditSearchPane.verifyErrorByIdentifier(
              userWithOpenTransaction.userId,
              'Open fees/fines',
            );

            // Step 11: Actions menu now only shows "Download errors (CSV)"
            BulkEditActions.openActions();
            BulkEditActions.downloadErrorsExists();
            BulkEditActions.downloadMatchedRecordsAbsent();

            // Step 12: Download errors (CSV)
            BulkEditActions.downloadErrors();
            FileManager.verifyFileIncludes(fileNames.errorsFromCommitting, [
              userWithOpenTransaction.userId,
              'Open fees/fines',
            ]);

            // Step 13: Open "Logs" tab and filter to the latest Users delete job
            BulkEditSearchPane.openLogsSearch();
            BulkEditLogs.verifyLogsPane();
            BulkEditLogs.checkUsersCheckbox();

            // Step 14: Click "..." action element in the row and verify available files
            BulkEditLogs.clickActionsRunBy(user.username);
            BulkEditLogs.verifyLogsRowActionForBulkDeleteWithQuery();

            // Step 15: Download "File with identifiers of the records affected by bulk update"
            BulkEditLogs.downloadQueryIdentifiers();
            FileManager.verifyFileIncludes(fileNames.identifiersQueryFilename, [
              userToDelete.userId,
              userWithOpenTransaction.userId,
            ]);

            // Step 16: Download "File with the query used to trigger the bulk edit"
            BulkEditLogs.downloadQueryStatementFile();
            FileManager.verifyFileIncludes(fileNames.queryStatementFilename, [
              `(users.id in (${userUUIDs.replace(/,/g, ', ')}))`,
            ]);

            // Step 17: Download "File with the matching records"
            BulkEditLogs.downloadFileWithMatchingRecords();
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              userToDelete.userId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              userToDelete.userId,
            );

            // Step 18: Download "File with errors encountered when deleting the records"
            BulkEditLogs.downloadFileWithErrorsFromDeleting();
            FileManager.verifyFileIncludes(fileNames.errorsFromCommitting, [
              userWithOpenTransaction.userId,
              'Open fees/fines',
            ]);

            // Step 19: Verify the deleted user is gone, the user with open transactions still exists
            cy.getAdminToken();
            cy.getUsers({ limit: 1, query: `id==${userToDelete.userId}` }).then((users) => {
              expect(users).to.have.length(0);
            });
            cy.getUsers({ limit: 1, query: `id==${userWithOpenTransaction.userId}` }).then(
              (users) => {
                expect(users).to.have.length(1);
              },
            );

            cy.resetTenant();
            cy.loginAsAdmin({ path: TopMenu.usersPath, waiter: UsersSearchPane.waitLoading });
            UsersSearchPane.searchByKeywords(userToDelete.username);
            UsersSearchPane.verifyUserIsAbsentInSearchResults(userToDelete.username);

            UsersSearchPane.searchByKeywords(userWithOpenTransaction.username);
            UsersSearchResultsPane.verifyUserIsPresentInTheList(userWithOpenTransaction.username);
          });
        },
      );
    });
  });
});
