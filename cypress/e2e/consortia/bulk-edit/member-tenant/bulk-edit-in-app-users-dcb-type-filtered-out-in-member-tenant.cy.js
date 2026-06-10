import uuid from 'uuid';
import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import QueryModal, {
  usersFieldValues,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Dcb from '../../../../support/fragments/dcb/dcb';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { getLongDelay } from '../../../../support/utils/cypressTools';

let user;
const dcbTransactionId1 = uuid();
const dcbTransactionId2 = uuid();
const dcbPatron1 = {
  id: uuid(),
  barcode: `dcb_${getRandomPostfix()}`,
  group: 'undergrad',
};
const dcbPatron2 = {
  id: uuid(),
  barcode: `dcb_${getRandomPostfix()}`,
  group: 'undergrad',
};
const userUUIDsFileName = `userUUIDs_C1273151_${getRandomPostfix()}.csv`;
const userBarcodesFileName = `userBarcodes_C1273151_${getRandomPostfix()}.csv`;
const errorsFromMatchingFileNameWithUUIDs = BulkEditFiles.getErrorsFromMatchingFileName(
  userUUIDsFileName,
  true,
);
const errorsFromMatchingFileNameWithBarcodes = BulkEditFiles.getErrorsFromMatchingFileName(
  userBarcodesFileName,
  true,
);

describe('Bulk-edit', () => {
  describe('Member tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditUpdateRecords.gui,
          permissions.uiUserEdit.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, [
            permissions.bulkEditUpdateRecords.gui,
            permissions.uiUserEdit.gui,
            permissions.bulkEditQueryView.gui,
          ]);

          ServicePoints.getViaApi({ limit: 1, query: 'name=="DCB"' }).then((servicePoints) => {
            const dcbServicePointId = servicePoints[0].id;

            Dcb.createTransactionViaApi(dcbTransactionId1, {
              item: {
                title: `AT_C1273151_item_${getRandomPostfix()}`,
                barcode: `item_${getRandomPostfix()}`,
                materialType: 'dvd',
                lendingLibraryCode: 'abc',
                locationCode: 'shadow-loc',
              },
              patron: dcbPatron1,
              pickup: {
                servicePointId: dcbServicePointId,
              },
              role: 'PICKUP',
            });

            Dcb.createTransactionViaApi(dcbTransactionId2, {
              item: {
                title: `AT_C1273151_item_${getRandomPostfix()}`,
                barcode: `item_${getRandomPostfix()}`,
                materialType: 'dvd',
                lendingLibraryCode: 'abc',
                locationCode: 'shadow-loc',
              },
              patron: dcbPatron2,
              pickup: {
                servicePointId: dcbServicePointId,
              },
              role: 'PICKUP',
            });

            FileManager.createFile(
              `cypress/fixtures/${userUUIDsFileName}`,
              `${dcbPatron1.id}\n${dcbPatron2.id}`,
            );
            FileManager.createFile(
              `cypress/fixtures/${userBarcodesFileName}`,
              `${dcbPatron1.barcode}\n${dcbPatron2.barcode}`,
            );
          });
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        if (user?.userId) Users.deleteViaApi(user.userId);
        Users.deleteViaApi(dcbPatron1.id);
        Users.deleteViaApi(dcbPatron2.id);
        [
          userUUIDsFileName,
          userBarcodesFileName,
          errorsFromMatchingFileNameWithUUIDs,
          errorsFromMatchingFileNameWithBarcodes,
        ].forEach((fileName) => {
          FileManager.deleteFileFromDownloadsByMask(fileName);
        });
      });

      it(
        'C1273151 Verify DCB type Users are filtered out in Bulk edit (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C1273151'] },
        () => {
          cy.resetTenant();
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

          // Steps 1-3: Upload file with DCB User UUIDs
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User UUIDs');
          BulkEditSearchPane.uploadFile(userUUIDsFileName);
          BulkEditSearchPane.verifyPaneTitleFileName(userUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('0 user');
          BulkEditSearchPane.verifyFileNameHeadLine(userUUIDsFileName);
          BulkEditSearchPane.verifyErrorLabel(2);
          BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);
          BulkEditSearchPane.verifyPaginatorInErrorsAccordion(2);

          // Step 4: Verify error columns for DCB User UUIDs
          [dcbPatron1.id, dcbPatron2.id].forEach((identifier) => {
            BulkEditSearchPane.verifyErrorByIdentifier(
              identifier,
              ERROR_MESSAGES.DCB_USERS_CANNOT_BE_BULK_EDITED,
            );
          });

          // Step 5: Open Actions menu and verify only "Download errors (CSV)" is shown
          BulkEditActions.openActions();
          BulkEditSearchPane.verifyCheckboxesAbsentInActionsDropdownMenu();
          BulkEditSearchPane.searchColumnNameTextfieldAbsent();

          // Step 6: Download errors CSV for UUIDs
          BulkEditActions.downloadErrors();
          [dcbPatron1.id, dcbPatron2.id].forEach((identifier) => {
            ExportFile.verifyFileIncludes(errorsFromMatchingFileNameWithUUIDs, [
              `ERROR,${identifier},${ERROR_MESSAGES.DCB_USERS_CANNOT_BE_BULK_EDITED}`,
            ]);
          });

          // Steps 7-9: Upload file with DCB User Barcodes
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User Barcodes');
          BulkEditSearchPane.uploadFile(userBarcodesFileName);
          BulkEditSearchPane.verifyPaneTitleFileName(userBarcodesFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('0 user');
          BulkEditSearchPane.verifyFileNameHeadLine(userBarcodesFileName);
          BulkEditSearchPane.verifyErrorLabel(2);
          BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);
          BulkEditSearchPane.verifyPaginatorInErrorsAccordion(2);

          // Step 8: Verify error columns for DCB User Barcodes
          [dcbPatron1.barcode, dcbPatron2.barcode].forEach((identifier) => {
            BulkEditSearchPane.verifyErrorByIdentifier(
              identifier,
              ERROR_MESSAGES.DCB_USERS_CANNOT_BE_BULK_EDITED,
            );
          });

          // Step 9: Download errors CSV for Barcodes
          BulkEditActions.openActions();
          BulkEditActions.downloadErrors();
          [dcbPatron1.barcode, dcbPatron2.barcode].forEach((identifier) => {
            ExportFile.verifyFileIncludes(errorsFromMatchingFileNameWithBarcodes, [
              `ERROR,${identifier},${ERROR_MESSAGES.DCB_USERS_CANNOT_BE_BULK_EDITED}`,
            ]);
          });

          // Step 10: Go to Query tab, select Users, click Build query
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkUsersRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          // Step 11: Build and test query for DCB type users
          QueryModal.selectField(usersFieldValues.userType);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect('DCB');
          cy.intercept('GET', '**/errors?limit=10&offset=0&errorType=ERROR').as('getErrors');
          QueryModal.testQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          // Steps 12-14: Run query, verify 0 matches with DCB errors, download errors CSV
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();
          cy.wait('@getErrors', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/errors/,
            )[1];
            const queryFileNames = BulkEditFiles.getAllQueryDownloadedFileNames(
              interceptedUuid,
              true,
            );

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('0 user');
            BulkEditSearchPane.verifyQueryHeadLine('(users.type == DCB)');
            BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);

            [dcbPatron1.id, dcbPatron2.id].forEach((identifier) => {
              BulkEditSearchPane.verifyErrorByIdentifier(
                identifier,
                ERROR_MESSAGES.DCB_USERS_CANNOT_BE_BULK_EDITED,
              );
            });

            BulkEditActions.openActions();
            BulkEditActions.downloadErrors();
            [dcbPatron1.id, dcbPatron2.id].forEach((identifier) => {
              ExportFile.verifyFileIncludes(queryFileNames.errorsFromMatching, [
                `ERROR,${identifier},${ERROR_MESSAGES.DCB_USERS_CANNOT_BE_BULK_EDITED}`,
              ]);
            });

            FileManager.deleteFileFromDownloadsByMask(queryFileNames.errorsFromMatching);
          });
        },
      );
    });
  });
});
