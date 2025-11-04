import uuid from 'uuid';
import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import QueryModal, {
  usersFieldValues,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import FileManager from '../../../../support/utils/fileManager';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import { getLongDelay } from '../../../../support/utils/cypressTools';

let user;
let memberTenantPatronUser;
let memberTenantStaffUser;
let invalidUserIds;
let invalidBarcode;
let invalidUsername;
let fileNames;
const invalidExternalId = uuid();

describe('Bulk-edit', () => {
  describe('Central tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditQueryView.gui,
          permissions.uiUsersView.gui,
          permissions.bulkEditUpdateRecords.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // Create Patron user in member tenant (for invalid identifiers - Precondition 4.1)
          cy.setTenant(Affiliations.College);
          cy.createTempUser([], 'faculty', 'patron').then((patronUserProperties) => {
            memberTenantPatronUser = patronUserProperties;

            cy.getUsers({ limit: 1, query: `username=${patronUserProperties.username}` }).then(
              (users) => {
                cy.updateUser({
                  ...users[0],
                  externalSystemId: invalidExternalId,
                });
              },
            );

            // Prepare invalid identifiers from patron user in member tenant
            invalidUserIds = [patronUserProperties.userId, uuid(), uuid()].join(',');
            invalidBarcode = patronUserProperties.barcode;
            invalidUsername = patronUserProperties.username;
          });

          cy.createTempUser([], 'faculty', 'staff').then((staffUserProperties) => {
            memberTenantStaffUser = staffUserProperties;

            cy.resetTenant();
            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            BulkEditSearchPane.openQuerySearch();
          });
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(memberTenantPatronUser.userId);
        Users.deleteViaApi(memberTenantStaffUser.userId);
        FileManager.deleteFileFromDownloadsByMask(fileNames.errorsFromMatching);
      });

      it(
        'C503034 Query - Verify "Errors" when querying by invalid Users identifiers in Central tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C503034'] },
        () => {
          // Step 1: Select "Users" radio button, click "Build query" button
          BulkEditSearchPane.checkUsersRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          // Step 2: Select "User - User UUID" field, "in" operator, type User UUIDs
          QueryModal.selectField(usersFieldValues.userId);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueTextfield(invalidUserIds);
          QueryModal.verifyQueryAreaContent(
            `(users.id in (${invalidUserIds.replace(/,/g, ', ')}))`,
          );
          QueryModal.testQueryDisabled(false);

          // Step 3: Click "Test query" button
          QueryModal.testQuery();
          QueryModal.verifyNumberOfMatchedRecords(0);
          QueryModal.runQueryDisabled();

          // Step 4: Select "User - Barcode" field, "equals" operator, type barcode
          QueryModal.selectField(usersFieldValues.userBarcode);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(invalidBarcode);
          QueryModal.testQuery();
          QueryModal.verifyNumberOfMatchedRecords(0);
          QueryModal.runQueryDisabled();

          // Step 5: Select "User - External system ID" field, "equals" operator
          QueryModal.selectField(usersFieldValues.externalSystemId);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(invalidExternalId);
          QueryModal.testQuery();
          QueryModal.verifyNumberOfMatchedRecords(0);
          QueryModal.runQueryDisabled();

          // Step 6: Select "User - Username" field, "equals" operator
          QueryModal.selectField(usersFieldValues.userName);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(invalidUsername);
          QueryModal.testQuery();
          QueryModal.verifyNumberOfMatchedRecords(0);
          QueryModal.runQueryDisabled();

          // Step 7: Select "User - User UUID" field, "equals" operator, type Staff User UUID
          QueryModal.selectField(usersFieldValues.userId);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(memberTenantStaffUser.userId);
          QueryModal.verifyQueryAreaContent(`(users.id == ${memberTenantStaffUser.userId})`);
          QueryModal.testQueryDisabled(false);

          // Step 8: Click "Test query" button
          cy.intercept('GET', '**/errors?limit=10&offset=0&errorType=ERROR').as('getPreview');
          QueryModal.testQuery();
          QueryModal.verifyNumberOfMatchedRecords(1);
          QueryModal.runQueryDisabled(false);

          // Step 9: Click "Run query" button, check Preview on "Bulk edit query" page
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();
          cy.wait('@getPreview', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/errors/,
            )[1];

            fileNames = BulkEditFiles.getAllQueryDownloadedFileNames(interceptedUuid, true);

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('0 user');
            BulkEditSearchPane.verifyErrorLabel(1, 0);
            BulkEditSearchPane.verifyPaginatorInErrorsAccordion(1);
            BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);
            BulkEditActions.openActions();

            // Step 10: Check the columns in the table populated with Top 10 Errors
            BulkEditSearchPane.verifyErrorByIdentifier(
              memberTenantStaffUser.userId,
              ERROR_MESSAGES.SHADOW_RECORDS_CANNOT_BE_BULK_EDITED,
            );

            // Step 11: Click "Actions" menu
            BulkEditActions.downloadErrorsExists();
            BulkEditSearchPane.verifySearchColumnNameTextFieldAbsent();
            BulkEditSearchPane.verifyCheckboxesAbsentInActionsDropdownMenu();

            // Step 12: Click "Actions" menu => Click "Download errors (CSV)" option
            BulkEditActions.downloadErrors();
            ExportFile.verifyFileIncludes(fileNames.errorsFromMatching, [
              `ERROR,${memberTenantStaffUser.userId},${ERROR_MESSAGES.SHADOW_RECORDS_CANNOT_BE_BULK_EDITED}`,
            ]);
          });
        },
      );
    });
  });
});
