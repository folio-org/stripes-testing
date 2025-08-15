import permissions from '../../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../../support/fragments/bulk-edit/bulk-edit-files';
import ExportFile from '../../../../../support/fragments/data-export/exportFile';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import FileManager from '../../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { tenantNames } from '../../../../../support/dictionary/affiliations';
import { BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../../support/constants';

let user;
let patronUser;
let staffUser;
const patronUserExternalId = getRandomPostfix();
const staffUserExternalId = getRandomPostfix();
const errorReason = 'Duplicate entry';
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
const userExternalIDsFileName = `userExternalIDs_${getRandomPostfix()}.csv`;
const usernamesFileName = `userUsernames_${getRandomPostfix()}.csv`;
const matchedRecordsFileNameWithUUIDs = BulkEditFiles.getMatchedRecordsFileName(
  userUUIDsFileName,
  true,
);
const matchedRecordsFileNameWithBarcodes = BulkEditFiles.getMatchedRecordsFileName(
  userBarcodesFileName,
  true,
);
const matchedRecordsFileNameWithExternalIds = BulkEditFiles.getMatchedRecordsFileName(
  userExternalIDsFileName,
  true,
);
const matchedRecordsFileNameWithNames = BulkEditFiles.getMatchedRecordsFileName(
  usernamesFileName,
  true,
);
const errorsFileName = BulkEditFiles.getErrorsFromMatchingFileName(usernamesFileName, true);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.getAdminToken();

        cy.createTempUser([
          permissions.bulkEditUpdateRecords.gui,
          permissions.uiUsersView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.createTempUser([], 'faculty', 'patron', true).then((patronUserProperties) => {
            patronUser = patronUserProperties;

            cy.getUsers({ limit: 1, query: `username=${patronUserProperties.username}` }).then(
              (patronUserData) => {
                cy.updateUser({
                  ...patronUserData[0],
                  externalSystemId: patronUserExternalId,
                });
              },
            );
          });

          cy.createTempUser([], 'faculty', 'staff', true)
            .then((staffUserProperties) => {
              staffUser = staffUserProperties;

              cy.getUsers({
                limit: 1,
                query: `username=${staffUserProperties.username}`,
              }).then((staffUserData) => {
                cy.updateUser({
                  ...staffUserData[0],
                  externalSystemId: staffUserExternalId,
                });
              });
            })
            .then(() => {
              FileManager.createFile(
                `cypress/fixtures/${userUUIDsFileName}`,
                `${patronUser.userId}\n${staffUser.userId}`,
              );
              FileManager.createFile(
                `cypress/fixtures/${userBarcodesFileName}`,
                `${patronUser.barcode}\n${staffUser.barcode}`,
              );
              FileManager.createFile(
                `cypress/fixtures/${userExternalIDsFileName}`,
                `${patronUserExternalId}\n${staffUserExternalId}`,
              );
              FileManager.createFile(
                `cypress/fixtures/${usernamesFileName}`,
                `${patronUser.username}\n${patronUser.username}\n${staffUser.username}`,
              );
            });
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        });
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
      });

      after('delete test data', () => {
        cy.getAdminToken();
        cy.resetTenant();
        Users.deleteViaApi(patronUser.userId);
        Users.deleteViaApi(staffUser.userId);
        Users.deleteViaApi(user.userId);

        [
          userUUIDsFileName,
          userBarcodesFileName,
          userExternalIDsFileName,
          usernamesFileName,
        ].forEach((fileName) => {
          FileManager.deleteFile(`cypress/fixtures/${fileName}`);
        });

        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsFileNameWithUUIDs,
          matchedRecordsFileNameWithBarcodes,
          matchedRecordsFileNameWithExternalIds,
          matchedRecordsFileNameWithNames,
          errorsFileName,
        );
      });

      it(
        'C477594 Identifier - Verify "Preview of record matched" when uploading valid Users identifiers in Central tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C477594'] },
        () => {
          const testParams = [
            {
              identifierType: 'User UUIDs',
              fileName: userUUIDsFileName,
              matchedRecordsFileName: matchedRecordsFileNameWithUUIDs,
            },
            {
              identifierType: 'User Barcodes',
              fileName: userBarcodesFileName,
              matchedRecordsFileName: matchedRecordsFileNameWithBarcodes,
            },
            {
              identifierType: 'External IDs',
              fileName: userExternalIDsFileName,
              matchedRecordsFileName: matchedRecordsFileNameWithExternalIds,
            },
            {
              identifierType: 'Usernames',
              fileName: usernamesFileName,
              matchedRecordsFileName: matchedRecordsFileNameWithNames,
            },
          ];

          testParams.forEach(({ identifierType, fileName, matchedRecordsFileName }) => {
            BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', identifierType);
            BulkEditSearchPane.uploadFile(fileName);
            BulkEditSearchPane.verifyPaneTitleFileName(fileName);
            BulkEditSearchPane.verifyPaneRecordsCount('2 user');
            BulkEditSearchPane.verifyFileNameHeadLine(fileName);
            BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);

            const testUsers = [staffUser, patronUser];

            testUsers.forEach((testUser) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                testUser.barcode,
                BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USERNAME,
                testUser.username,
              );
            });

            BulkEditSearchPane.verifyActionsAfterConductedCSVUploading(false);
            BulkEditSearchPane.verifySearchColumnNameTextFieldExists();
            BulkEditActions.openActions();
            BulkEditActions.downloadMatchedResults();

            testUsers.forEach((testUser) => {
              BulkEditFiles.verifyValueInRowByUUID(
                matchedRecordsFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
                testUser.userId,
                'User name',
                testUser.username,
              );
            });

            if (identifierType === 'Usernames') {
              BulkEditSearchPane.verifyErrorLabel(0, 1);
              BulkEditSearchPane.verifyShowWarningsCheckbox(true, true);
              BulkEditSearchPane.verifyPaginatorInErrorsAccordion(1);
              BulkEditSearchPane.verifyErrorByIdentifier(
                patronUser.username,
                errorReason,
                'Warning',
              );
              BulkEditActions.downloadErrors();
              ExportFile.verifyFileIncludes(errorsFileName, [
                `WARNING,${patronUser.username},${errorReason}`,
              ]);
              BulkEditFiles.verifyCSVFileRecordsNumber(errorsFileName, 1);
            }
          });
        },
      );
    });
  });
});
