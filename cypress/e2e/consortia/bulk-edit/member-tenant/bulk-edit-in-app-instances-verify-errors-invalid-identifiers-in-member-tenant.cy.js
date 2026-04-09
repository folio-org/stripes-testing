import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ExportFile from '../../../../support/fragments/data-export/exportFile';

let user;
const invalidInstanceUUIDsFileName = `AT_C965838_InvalidInstanceUUIDs_${getRandomPostfix()}.csv`;
const invalidInstanceHRIDsFileName = `AT_C965838_InvalidInstanceHRIDs_${getRandomPostfix()}.csv`;
const errorsFromMatchingUUIDsFileName = BulkEditFiles.getErrorsFromMatchingFileName(
  invalidInstanceUUIDsFileName,
);
const errorsFromMatchingHRIDsFileName = BulkEditFiles.getErrorsFromMatchingFileName(
  invalidInstanceHRIDsFileName,
);

const invalidInstanceUUIDs = [];
const invalidInstanceHRIDs = [];

for (let i = 0; i < 10; i++) {
  invalidInstanceUUIDs.push(
    `${getRandomPostfix()}-${getRandomPostfix()}-${getRandomPostfix()}-${getRandomPostfix()}-${getRandomPostfix()}`,
  );
  invalidInstanceHRIDs.push(`hrid${getRandomPostfix()}`);
}

describe('Bulk-edit', () => {
  describe('Member tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditInstances.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, [
            permissions.bulkEditEdit.gui,
            permissions.uiInventoryViewCreateEditInstances.gui,
          ]);

          FileManager.createFile(
            `cypress/fixtures/${invalidInstanceUUIDsFileName}`,
            invalidInstanceUUIDs.join('\n'),
          );
          FileManager.createFile(
            `cypress/fixtures/${invalidInstanceHRIDsFileName}`,
            invalidInstanceHRIDs.join('\n'),
          );

          cy.resetTenant();
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${invalidInstanceUUIDsFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${invalidInstanceHRIDsFileName}`);
        FileManager.deleteFileFromDownloadsByMask(errorsFromMatchingUUIDsFileName);
        FileManager.deleteFileFromDownloadsByMask(errorsFromMatchingHRIDsFileName);
      });

      it(
        'C965838 Verify "Errors" when uploading invalid Instance identifiers in Member tenant (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C965838'] },
        () => {
          // Step 1: Select "Inventory - instances" radio button and "Instance UUIDs" identifier
          BulkEditSearchPane.checkInstanceRadio();
          BulkEditSearchPane.selectRecordIdentifier('Instance UUIDs');
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');

          // Step 2: Upload File 1 with invalid Instance UUIDs
          BulkEditSearchPane.uploadFile(invalidInstanceUUIDsFileName);
          BulkEditSearchPane.checkForUploading(invalidInstanceUUIDsFileName);

          // Step 3: Check the result of uploading the .csv file with Instance UUIDs
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyPaneTitleFileName(invalidInstanceUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('0 instance');
          BulkEditSearchPane.verifyFileNameHeadLine(invalidInstanceUUIDsFileName);
          BulkEditSearchPane.verifyErrorLabel(invalidInstanceUUIDs.length);

          invalidInstanceUUIDs.forEach((uuid) => {
            BulkEditSearchPane.verifyNonMatchedResults(uuid);
          });

          BulkEditSearchPane.verifyPaginatorInErrorsAccordion(invalidInstanceUUIDs.length);

          // Step 4: Check the columns in the error table
          invalidInstanceUUIDs.forEach((uuid) => {
            BulkEditSearchPane.verifyErrorByIdentifier(uuid, 'No match found', 'Error');
          });

          // Step 5: Click "Actions" menu
          BulkEditActions.openActions();
          BulkEditSearchPane.searchColumnNameTextfieldAbsent();
          BulkEditActions.downloadErrorsExists();

          // Step 6: Click "Download errors (CSV)"
          BulkEditActions.downloadErrors();
          invalidInstanceUUIDs.forEach((uuid) => {
            ExportFile.verifyFileIncludes(errorsFromMatchingUUIDsFileName, [
              `ERROR,${uuid},No match found`,
            ]);
          });

          // Step 7: Select "Instance HRIDs" from the "Record identifier" dropdown
          BulkEditSearchPane.selectRecordIdentifier('Instance HRIDs');
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance HRIDs');

          // Step 8: Upload File 2 with invalid Instance HRIDs
          BulkEditSearchPane.uploadFile(invalidInstanceHRIDsFileName);
          BulkEditSearchPane.checkForUploading(invalidInstanceHRIDsFileName);

          // Step 9: Check the result of uploading the .csv file with Instance HRIDs
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyPaneTitleFileName(invalidInstanceHRIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('0 instance');
          BulkEditSearchPane.verifyFileNameHeadLine(invalidInstanceHRIDsFileName);
          BulkEditSearchPane.verifyErrorLabel(invalidInstanceHRIDs.length);

          invalidInstanceHRIDs.forEach((hrid) => {
            BulkEditSearchPane.verifyNonMatchedResults(hrid);
          });

          BulkEditSearchPane.verifyPaginatorInErrorsAccordion(invalidInstanceHRIDs.length);

          // Step 10: Check the columns in the error table
          invalidInstanceHRIDs.forEach((hrid) => {
            BulkEditSearchPane.verifyErrorByIdentifier(hrid, 'No match found', 'Error');
          });

          // Step 11: Click "Actions" menu => Click "Download errors (CSV)"
          BulkEditActions.openActions();
          BulkEditActions.downloadErrors();
          invalidInstanceHRIDs.forEach((hrid) => {
            ExportFile.verifyFileIncludes(errorsFromMatchingHRIDsFileName, [
              `ERROR,${hrid},No match found`,
            ]);
          });
        },
      );
    });
  });
});
