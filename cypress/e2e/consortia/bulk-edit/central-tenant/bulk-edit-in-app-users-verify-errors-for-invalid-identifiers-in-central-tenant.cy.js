import uuid from 'uuid';
import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';

let collegeUser;
let universityUser;
const users = [];
const userExternalIdInCollege = getRandomPostfix();
const userExternalIdInUniversity = getRandomPostfix();
const invalidIdentifier = uuid();
const invalidUsername = `AT_Username_${getRandomPostfix()}`;
const errorReason = 'No match found';
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
const userExternalIDsFileName = `userExternalIDs_${getRandomPostfix()}.csv`;
const usernamesFileName = `userUsernames_${getRandomPostfix()}.csv`;
const errorsFromMatchingFileNameWithUUIDs = BulkEditFiles.getErrorsFromMatchingFileName(
  userUUIDsFileName,
  true,
);
const errorsFromMatchingFileNameWithBarcodes = BulkEditFiles.getErrorsFromMatchingFileName(
  userBarcodesFileName,
  true,
);
const errorsFromMatchingFileNameWithExternalIds = BulkEditFiles.getErrorsFromMatchingFileName(
  userExternalIDsFileName,
  true,
);
const errorsFromMatchingFileNameWithNames = BulkEditFiles.getErrorsFromMatchingFileName(
  usernamesFileName,
  true,
);

describe('Bulk-edit', () => {
  describe('Central tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.getAdminToken();

        for (let i = 0; i < 4; i++) {
          cy.createTempUser([
            permissions.bulkEditUpdateRecords.gui,
            permissions.bulkEditLogsView.gui,
            permissions.uiUsersView.gui,
          ]).then((userProperties) => {
            users.push(userProperties);
          });
        }

        cy.withinTenant(Affiliations.College, () => {
          cy.createTempUser([], 'faculty', 'patron', true).then((collegeUserProperties) => {
            collegeUser = collegeUserProperties;

            cy.getUsers({ limit: 1, query: `username=${collegeUserProperties.username}` }).then(
              (user) => {
                cy.updateUser({
                  ...user[0],
                  externalSystemId: userExternalIdInCollege,
                });
              },
            );
          });
        });

        cy.withinTenant(Affiliations.University, () => {
          cy.createTempUser([], 'faculty', 'staff', true).then((universityUserProperties) => {
            universityUser = universityUserProperties;

            cy.getUsers({
              limit: 1,
              query: `username=${universityUserProperties.username}`,
            }).then((user) => {
              cy.updateUser({
                ...user[0],
                externalSystemId: userExternalIdInUniversity,
              });
            });
          });
        }).then(() => {
          FileManager.createFile(
            `cypress/fixtures/${userUUIDsFileName}`,
            `${collegeUser.userId}\n${invalidIdentifier}\n${universityUser.userId}`,
          );
          FileManager.createFile(
            `cypress/fixtures/${userBarcodesFileName}`,
            `${collegeUser.barcode}\n${invalidIdentifier}\n${universityUser.barcode}`,
          );
          FileManager.createFile(
            `cypress/fixtures/${userExternalIDsFileName}`,
            `${userExternalIdInCollege}\n${invalidIdentifier}\n${userExternalIdInUniversity}`,
          );
          FileManager.createFile(
            `cypress/fixtures/${usernamesFileName}`,
            `${collegeUser.username}\n${invalidUsername}\n${universityUser.username}`,
          );
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        cy.withinTenant(Affiliations.College, () => {
          Users.deleteViaApi(collegeUser.userId);
        });

        cy.withinTenant(Affiliations.University, () => {
          Users.deleteViaApi(universityUser.userId);
        });

        cy.withinTenant(Affiliations.Consortia, () => {
          users.forEach((user) => {
            Users.deleteViaApi(user.userId);
          });
        });

        [
          userUUIDsFileName,
          userBarcodesFileName,
          userExternalIDsFileName,
          usernamesFileName,
          errorsFromMatchingFileNameWithUUIDs,
          errorsFromMatchingFileNameWithBarcodes,
          errorsFromMatchingFileNameWithExternalIds,
          errorsFromMatchingFileNameWithNames,
        ].forEach((fileName) => {
          FileManager.deleteFileFromDownloadsByMask(fileName);
        });
      });

      it(
        'C895653 Identifier - Verify "Errors" when uploading invalid Users identifiers in Central tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C895653'] },
        () => {
          const testParams = [
            {
              user: users[0],
              identifierType: 'User UUIDs',
              fileName: userUUIDsFileName,
              errorsFileName: errorsFromMatchingFileNameWithUUIDs,
              identifiers: [collegeUser.userId, invalidIdentifier, universityUser.userId],
            },
            {
              user: users[1],
              identifierType: 'User Barcodes',
              fileName: userBarcodesFileName,
              errorsFileName: errorsFromMatchingFileNameWithBarcodes,
              identifiers: [collegeUser.barcode, invalidIdentifier, universityUser.barcode],
            },
            {
              user: users[2],
              identifierType: 'External IDs',
              fileName: userExternalIDsFileName,
              errorsFileName: errorsFromMatchingFileNameWithExternalIds,
              identifiers: [userExternalIdInCollege, invalidIdentifier, userExternalIdInUniversity],
            },
            {
              user: users[3],
              identifierType: 'Usernames',
              fileName: usernamesFileName,
              errorsFileName: errorsFromMatchingFileNameWithNames,
              identifiers: [collegeUser.username, invalidUsername, universityUser.username],
            },
          ];

          testParams.forEach(({ user, identifierType, fileName, errorsFileName, identifiers }) => {
            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', identifierType);
            BulkEditSearchPane.uploadFile(fileName);
            BulkEditSearchPane.verifyPaneTitleFileName(fileName);
            BulkEditSearchPane.verifyPaneRecordsCount('0 user');
            BulkEditSearchPane.verifyFileNameHeadLine(fileName);
            BulkEditSearchPane.verifyErrorLabel(3);
            BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);
            BulkEditSearchPane.verifyPaginatorInErrorsAccordion(3);

            identifiers.forEach((identifier) => {
              BulkEditSearchPane.verifyNonMatchedResults(identifier);
            });

            BulkEditActions.openActions();
            BulkEditSearchPane.searchColumnNameTextfieldAbsent();
            BulkEditActions.downloadErrors();

            identifiers.forEach((identifier) => {
              ExportFile.verifyFileIncludes(errorsFileName, [`ERROR,${identifier},${errorReason}`]);
            });

            BulkEditFiles.verifyCSVFileRecordsNumber(errorsFileName, 3);

            // remove earlier diwnloaded files
            FileManager.deleteFile(`cypress/fixtures/${fileName}`);
            FileManager.deleteFileFromDownloadsByMask(errorsFileName);

            BulkEditSearchPane.openLogsSearch();
            BulkEditLogs.verifyLogsPane();
            BulkEditLogs.checkUsersCheckbox();
            BulkEditLogs.verifyLogStatus(user.username, 'Completed with errors');
            BulkEditLogs.clickActionsRunBy(user.username);
            BulkEditLogs.verifyLogsRowActionWhenCompletedWithErrorsWithoutModification();
            BulkEditLogs.downloadFileUsedToTrigger();
            BulkEditFiles.verifyCSVFileRows(fileName, identifiers);
            BulkEditFiles.verifyCSVFileRecordsNumber(fileName, 3);
            BulkEditLogs.downloadFileWithErrorsEncountered();

            identifiers.forEach((identifier) => {
              ExportFile.verifyFileIncludes(errorsFileName, [`ERROR,${identifier},${errorReason}`]);
            });

            BulkEditFiles.verifyCSVFileRecordsNumber(errorsFileName, 3);
          });
        },
      );
    });
  });
});
