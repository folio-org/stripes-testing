import moment from 'moment';
import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import UsersSearchResultsPane from '../../../support/fragments/users/usersSearchResultsPane';
import TopMenu from '../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import ManualCharges from '../../../support/fragments/settings/users/manualCharges';
import UsersOwners from '../../../support/fragments/settings/users/usersOwners';
import NewFeeFine from '../../../support/fragments/users/newFeeFine';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import { BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../support/constants';

let user;
let userToDelete;
let userWithOpenTransaction;
const userUUIDsFileName = `userUUIDs-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(userUUIDsFileName);
const errorsFromCommittingFileName =
  BulkEditFiles.getErrorsFromCommittingFileName(userUUIDsFileName);
const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
const ownerData = {};
const feeFineType = {};
let feeFineAccount;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.getAdminToken();

      // Preconditions: User records without open transactions - will be deleted
      cy.createTempUser([]).then((userProperties) => {
        userToDelete = userProperties;
      });

      // Preconditions: User records with open transactions - deletion is expected to fail
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
        permissions.uiUsersView.gui,
        permissions.uiUsersDelete.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });

        FileManager.createFile(
          `cypress/fixtures/${userUUIDsFileName}`,
          `"${userToDelete.userId}"\n"${userWithOpenTransaction.userId}"`,
        );

        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User UUIDs');
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      NewFeeFine.deleteFeeFineAccountViaApi(feeFineAccount.id);
      ManualCharges.deleteViaApi(feeFineType.id);
      UsersOwners.deleteViaApi(ownerData.id);
      ServicePoints.deleteViaApi(servicePoint.id);
      Users.deleteViaApi(user.userId);
      // userToDelete is expected to be deleted by the test; ignore errors if already deleted
      Users.deleteViaApi(userToDelete.userId);
      Users.deleteViaApi(userWithOpenTransaction.userId);
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        errorsFromCommittingFileName,
      );
    });

    it(
      'C1385659 Verify bulk deletion of User records (athena)',
      { tags: ['extendedPath', 'athena', 'C1385659'] },
      () => {
        // Step 1: Check the Preview of records matched
        BulkEditSearchPane.verifyPaneRecordsCount('2 user');
        BulkEditSearchPane.verifyMatchedResults(
          userToDelete.username,
          userWithOpenTransaction.username,
        );
        BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);
        BulkEditSearchPane.verifyPaneTitleFileName(userUUIDsFileName);
        BulkEditSearchPane.verifyFileNameHeadLine(userUUIDsFileName);
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedRecordsExists();

        // Step 2: Download matched records (CSV)
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();
        BulkEditFiles.verifyValueInRowByUUID(
          matchedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
          userToDelete.userId,
          BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
          userToDelete.userId,
        );

        // Step 3: Open "Actions" menu, click "Start bulk delete" and verify the confirmation modal
        BulkEditActions.clickStartBulkDeleteButton();
        BulkEditActions.verifyDeleteUserRecordsModalContent(2, 30);
        BulkEditActions.verifyDeleteUserRecordsModalButtons();

        // Steps 4-6: Click "Delete" and verify the confirmation screen upon delete completion
        BulkEditActions.clickDeleteButtonInDeleteUserRecordsModal();
        BulkEditActions.verifyUsersDeletedSuccessfully(2, 1);
        BulkEditSearchPane.verifyPaneRecordsChangedCount(0);
        BulkEditSearchPane.verifyPaneTitleFileName(userUUIDsFileName);
        BulkEditSearchPane.verifyFileNameHeadLine(userUUIDsFileName);

        // Step 7: Review reasons for not deleted records under "Errors & warnings"
        BulkEditSearchPane.verifyErrorsAccordionIncludesNumberOfIdentifiers(1, [
          userWithOpenTransaction.userId,
        ]);
        BulkEditSearchPane.verifyErrorByIdentifier(
          userWithOpenTransaction.userId,
          'Open fees/fines',
        );

        // Step 8: Download errors (CSV)
        BulkEditActions.openActions();
        BulkEditActions.downloadErrorsExists();
        BulkEditActions.downloadMatchedRecordsAbsent();
        BulkEditActions.downloadErrors();
        FileManager.verifyFileIncludes(errorsFromCommittingFileName, [
          'ERROR',
          userWithOpenTransaction.userId,
          'Open fees/fines',
        ]);

        // Step 9: Verify that made changes have been applied to Users
        cy.getAdminToken();
        cy.getUsers({ limit: 1, query: `id==${userToDelete.userId}` }).then((users) => {
          expect(users).to.have.length(0);
        });
        cy.getUsers({ limit: 1, query: `id==${userWithOpenTransaction.userId}` }).then((users) => {
          expect(users).to.have.length(1);
        });

        cy.loginAsAdmin({ path: TopMenu.usersPath, waiter: UsersSearchPane.waitLoading });
        UsersSearchPane.searchByKeywords(userToDelete.username);
        UsersSearchPane.verifyUserIsAbsentInSearchResults(userToDelete.username);

        UsersSearchPane.searchByKeywords(userWithOpenTransaction.username);
        UsersSearchResultsPane.verifyUserIsPresentInTheList(userWithOpenTransaction.username);
      },
    );
  });
});
