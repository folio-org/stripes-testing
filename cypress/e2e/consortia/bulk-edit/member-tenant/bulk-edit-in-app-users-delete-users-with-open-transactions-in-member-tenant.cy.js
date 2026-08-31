import moment from 'moment';
import uuid from 'uuid';
import permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
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
import getRandomPostfix from '../../../../support/utils/stringTools';
import { BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';

let user;
const usersWithOpenTransactions = [];
const userBarcodesFileName = `userBarcodes-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(userBarcodesFileName);
const errorsFromCommittingFileName =
  BulkEditFiles.getErrorsFromCommittingFileName(userBarcodesFileName);
const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
const ownerData = {};
const feeFineType = {};
const feeFineAccounts = [];

describe('Bulk-edit', () => {
  describe('Member tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        // Fetch the admin source record on the central tenant, where the admin user exists
        cy.getAdminSourceRecord().then((adminSourceRecord) => {
          // Create tenant-scoped data on the College tenant. The central admin token works
          // cross-tenant, so createViaApi calls do not need to re-authenticate.
          cy.setTenant(Affiliations.College);

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

                // Create real users directly in the College (member) tenant so they are
                // searchable by barcode in Bulk edit (affiliation shadows have no barcode).
                cy.getFirstUserGroupId({ limit: 1 }).then((userGroup) => {
                  [0, 1].forEach((index) => {
                    const userBody = Users.generateUserModel();
                    userBody.patronGroup = userGroup.id;

                    Users.createViaApi(userBody).then((createdUser) => {
                      usersWithOpenTransactions[index] = {
                        userId: createdUser.id,
                        username: createdUser.username,
                        barcode: createdUser.barcode,
                        personal: userBody.personal,
                      };

                      const feeFineAccount = {
                        id: uuid(),
                        ownerId: ownerData.id,
                        feeFineId: feeFineType.id,
                        amount: 100,
                        userId: createdUser.id,
                        feeFineType: feeFineType.name,
                        feeFineOwner: ownerData.name,
                        createdAt: servicePoint.id,
                        dateAction: moment.utc().format(),
                        source: adminSourceRecord,
                      };
                      NewFeeFine.createViaApi(feeFineAccount).then((feeFineAccountId) => {
                        feeFineAccount.id = feeFineAccountId;
                        feeFineAccounts.push(feeFineAccount);
                      });
                    });
                  });
                });
              });
            });

          cy.resetTenant();

          // Create the acting user on the central tenant, affiliate to College and grant permissions there.
          cy.getAdminToken();
          cy.createTempUser([
            permissions.bulkEditUsersDelete.gui,
            permissions.bulkEditLogsView.gui,
            permissions.uiUsersEdit.gui,
            permissions.uiUsersDelete.gui,
          ]).then((userProperties) => {
            user = userProperties;

            cy.assignAffiliationToUser(Affiliations.College, user.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(user.userId, [
              permissions.bulkEditUsersDelete.gui,
              permissions.bulkEditLogsView.gui,
              permissions.uiUsersEdit.gui,
              permissions.uiUsersDelete.gui,
            ]);

            cy.resetTenant();
            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);

            FileManager.createFile(
              `cypress/fixtures/${userBarcodesFileName}`,
              `${usersWithOpenTransactions[0].barcode}\n${usersWithOpenTransactions[1].barcode}`,
            );

            BulkEditSearchPane.checkUsersRadio();
            BulkEditSearchPane.selectRecordIdentifier('User Barcodes');
            BulkEditSearchPane.uploadFile(userBarcodesFileName);
            BulkEditSearchPane.waitFileUploading();
          });
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        feeFineAccounts.forEach((feeFineAccount) => {
          NewFeeFine.deleteFeeFineAccountViaApi(feeFineAccount.id);
        });
        ManualCharges.deleteViaApi(feeFineType.id);
        UsersOwners.deleteViaApi(ownerData.id);
        ServicePoints.deleteViaApi(servicePoint.id);
        usersWithOpenTransactions.forEach((userProperties) => {
          Users.deleteViaApi(userProperties.userId);
        });
        cy.resetTenant();
        cy.getAdminToken();
        if (user) {
          Users.deleteViaApi(user.userId);
        }
        FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsFileName,
          errorsFromCommittingFileName,
        );
      });

      it(
        'C1385660 Verify bulk delete Users in Member tenant (athena)',
        { tags: ['smokeECS', 'athena', 'C1385660'] },
        () => {
          // Step 1: Check the Preview of records matched
          BulkEditSearchPane.verifyPaneRecordsCount('2 user');
          BulkEditSearchPane.verifyMatchedResults(
            usersWithOpenTransactions[0].username,
            usersWithOpenTransactions[1].username,
          );
          BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);

          // Step 2: Open "Actions" menu and verify available options
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedRecordsExists();
          BulkEditActions.startBulkEditButtonExists();
          BulkEditActions.verifySelectBulkEditProfileButtonExists('users');
          BulkEditActions.startBulkDeleteButtonExists();

          // Step 3: Download matched records (CSV)
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();
          BulkEditFiles.verifyValueInRowByUUID(
            matchedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
            usersWithOpenTransactions[0].userId,
            BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
            usersWithOpenTransactions[0].userId,
          );

          // Step 4: Open "Actions" menu, click "Start bulk edit"
          BulkEditActions.openStartBulkEditForm();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Step 5: Select an option/action to modify Users records
          const oldEmailDomain = usersWithOpenTransactions[0].personal.email;
          const newEmailDomain = 'new_email@google.com';

          BulkEditActions.replaceEmail(oldEmailDomain, newEmailDomain);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 6: Click "Confirm changes" button
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyAreYouSureForm(2);
          BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);
          BulkEditActions.verifyKeepEditingButtonDisabled(false);
          BulkEditActions.verifyDownloadPreviewButtonDisabled(false);

          // Step 7: Click "Keep editing", then "Cancel" on Bulk edit form
          BulkEditActions.clickKeepEditingBtn();
          BulkEditActions.closeBulkEditInAppForm();
          BulkEditSearchPane.verifyPaneRecordsCount('2 user');
          BulkEditSearchPane.verifyMatchedResults(
            usersWithOpenTransactions[0].username,
            usersWithOpenTransactions[1].username,
          );

          // Step 8: Open "Actions" menu, click "Start bulk delete"
          BulkEditActions.openActions();
          BulkEditActions.clickStartBulkDeleteButton();
          BulkEditActions.verifyDeleteUserRecordsModalContent(2, 30);
          BulkEditActions.verifyDeleteUserRecordsModalButtons();

          // Step 9: Click "Delete" button
          BulkEditActions.clickDeleteButtonInDeleteUserRecordsModal();
          BulkEditActions.verifyUsersDeletedSuccessfully(2, 0);
          BulkEditSearchPane.verifyPaneTitleFileName(userBarcodesFileName);
          BulkEditSearchPane.verifyFileNameHeadLine(userBarcodesFileName);
          BulkEditSearchPane.verifyPaneRecordsChangedCount(0);

          // Step 10: Review reasons for not deleted records under "Errors & warnings"
          BulkEditSearchPane.verifyErrorsAccordionIncludesNumberOfIdentifiers(2, [
            usersWithOpenTransactions[0].barcode,
            usersWithOpenTransactions[1].barcode,
          ]);

          // Step 11: Actions menu now only shows "Download errors (CSV)"
          BulkEditActions.openActions();
          BulkEditActions.downloadErrorsExists();
          BulkEditActions.downloadMatchedRecordsAbsent();

          // Step 12: Download errors (CSV)
          BulkEditActions.downloadErrors();
          FileManager.verifyFileIncludes(errorsFromCommittingFileName, [
            'ERROR',
            usersWithOpenTransactions[0].barcode,
            usersWithOpenTransactions[1].barcode,
            'Open fees/fines',
          ]);

          // Step 13: Open "Logs" tab and filter to the latest Users delete job by User A
          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.verifyLogsPane();
          BulkEditLogs.checkUsersCheckbox();

          // Step 14: Click "..." action element in the row and verify available files
          BulkEditLogs.clickActionsRunBy(user.username);
          BulkEditLogs.verifyLogsRowActionForBulkDeleteWithErrors();

          // Step 15: Download "File that was used to trigger the bulk edit"
          BulkEditLogs.downloadFileUsedToTrigger();
          BulkEditFiles.verifyCSVFileRows(userBarcodesFileName, [
            usersWithOpenTransactions[0].barcode,
            usersWithOpenTransactions[1].barcode,
          ]);

          // Step 16: Download "File with the matching records"
          BulkEditLogs.downloadFileWithMatchingRecords();
          BulkEditFiles.verifyValueInRowByUUID(
            matchedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
            usersWithOpenTransactions[1].userId,
            BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
            usersWithOpenTransactions[1].userId,
          );

          // Step 17: Download "File with errors encountered when deleting the records"
          BulkEditLogs.downloadFileWithErrorsFromDeleting();
          FileManager.verifyFileIncludes(errorsFromCommittingFileName, [
            usersWithOpenTransactions[0].barcode,
            usersWithOpenTransactions[1].barcode,
            'Open fees/fines',
          ]);

          // Step 18: Verify that no changes have been applied to the Users
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          cy.getUsers({ limit: 1, query: `id==${usersWithOpenTransactions[0].userId}` }).then(
            (users) => {
              expect(users).to.have.length(1);
            },
          );
          cy.getUsers({ limit: 1, query: `id==${usersWithOpenTransactions[1].userId}` }).then(
            (users) => {
              expect(users).to.have.length(1);
            },
          );

          cy.resetTenant();
          // Open the Users app and switch to the College tenant to verify the users still exist there.
          cy.loginAsAdmin({ path: TopMenu.usersPath, waiter: UsersSearchPane.waitLoading });
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          // Switching the active affiliation redirects away from the Users app, so re-open it.
          cy.visit(TopMenu.usersPath);
          UsersSearchPane.waitLoading();

          UsersSearchPane.searchByKeywords(usersWithOpenTransactions[0].username);
          UsersSearchResultsPane.verifyUserIsPresentInTheList(
            usersWithOpenTransactions[0].username,
          );

          UsersSearchPane.searchByKeywords(usersWithOpenTransactions[1].username);
          UsersSearchResultsPane.verifyUserIsPresentInTheList(
            usersWithOpenTransactions[1].username,
          );
        },
      );
    });
  });
});
