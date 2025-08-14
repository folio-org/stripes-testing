import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import QueryModal, {
  usersFieldValues,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import UsersCard from '../../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import FileManager from '../../../../support/utils/fileManager';
import DateTools from '../../../../support/utils/dateTools';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';

let user;
let matchedRecordsQueryFileName;
let previewQueryFileName;
let changedRecordsQueryFileName;
const newEmailDomain = 'bulkedit.com';

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditUpdateRecords.gui,
          permissions.bulkEditCsvView.gui,
          permissions.uiUserEdit.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkUsersRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();
          QueryModal.selectField(usersFieldValues.userType);
          QueryModal.verifySelectedField(usersFieldValues.userType);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect('Staff');
          QueryModal.addNewRow();
          QueryModal.selectField(usersFieldValues.lastName, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.fillInValueTextfield(user.personal.lastName, 1);
          QueryModal.testQuery();
          QueryModal.verifyPreviewOfRecordsMatched();
          cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsQueryFileName,
          previewQueryFileName,
          changedRecordsQueryFileName,
        );
      });

      it(
        'C503058 Verify bulk edit actions for Users in Central tenant - Query (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C503058'] },
        () => {
          // Step 1: Click "Run query" button
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();
          cy.wait('@getPreview', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            matchedRecordsQueryFileName = `*-Matched-Records-Query-${interceptedUuid}.csv`;
            previewQueryFileName = `*-Updates-Preview-CSV-Query-${interceptedUuid}.csv`;
            changedRecordsQueryFileName = `*-Changed-Records-CSV-Query-${interceptedUuid}.csv`;

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('1 user');
            BulkEditSearchPane.verifyPaginatorInMatchedRecords(1);

            // Step 2: Click "Actions" menu
            BulkEditActions.openActions();
            BulkEditActions.startBulkEditLocalAbsent();

            // Step 3: Click "Actions" menu => Click "Download matched records (CSV)" element
            BulkEditActions.openActions();
            BulkEditActions.downloadMatchedResults();
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsQueryFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              user.userId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.LAST_NAME,
              user.username,
            );

            // Step 4: Click "Actions" menu => Select the "Start bulk edit" element
            BulkEditActions.openInAppStartBulkEditFrom();
            BulkEditActions.verifyBulkEditsAccordionExists();
            BulkEditActions.verifyOptionsDropdown();
            BulkEditActions.verifyRowIcons();

            // Step 5-6: Select "Email" and configure find/replace
            const originalEmailDomain = user.personal.email.split('@')[1];
            const newEmail = user.personal.email.replace(/@.*/, `@${newEmailDomain}`);

            BulkEditActions.replaceEmail(originalEmailDomain, newEmailDomain);
            BulkEditActions.replaceWithIsDisabled();

            // Step 7: Click on the "Plus" icon
            BulkEditActions.addNewBulkEditFilterString();
            BulkEditActions.verifyNewBulkEditRow();

            // Step 8-9: Select "Expiration date" and set future date
            BulkEditActions.selectOption('Expiration date', 1);

            const futureDate = DateTools.getFutureWeekDateObj();
            const furureDateWithSlashes = DateTools.getFormattedDateWithSlashes({
              date: futureDate,
            });
            const newExpirationDateInFile = `${DateTools.getFormattedDate({ date: futureDate })} 23:59:59.000Z`;

            BulkEditActions.fillExpirationDate(futureDate, 1);
            BulkEditActions.replaceWithIsDisabled(1);

            // Step 10-11: Click on the "Plus" icon, Select "Patron group"
            BulkEditActions.addNewBulkEditFilterString();
            BulkEditActions.selectOption('Patron group', 2);
            BulkEditActions.replaceWithIsDisabled(2);

            const newPatronGroup = 'faculty (Faculty Member)';

            BulkEditActions.fillPatronGroup(newPatronGroup, 2);

            // Step 12: Click "Confirm changes" button
            BulkEditActions.confirmChanges();
            BulkEditActions.verifyMessageBannerInAreYouSureForm(1);

            const editedColumnValues = [
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EMAIL,
                value: newEmail,
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.PATRON_GROUP,
                value: 'faculty',
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EXPIRATION_DATE,
                value: furureDateWithSlashes,
              },
            ];

            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              user.barcode,
              editedColumnValues,
            );

            // Step 13: Click "Download preview in CSV format" button
            BulkEditActions.downloadPreview();

            const editedColumnValuesInFile = [
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EMAIL,
                value: newEmail,
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.PATRON_GROUP,
                value: 'faculty',
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EXPIRATION_DATE,
                value: newExpirationDateInFile,
              },
            ];

            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              previewQueryFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.BARCODE,
              user.barcode,
              editedColumnValuesInFile,
            );

            // Step 14: Click "Commit changes" button
            BulkEditActions.commitChanges();
            BulkEditActions.verifySuccessBanner(1);
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
              user.barcode,
              editedColumnValues,
            );

            // Step 15: Click "Actions" menu => Select "Download changed records (CSV)" element
            BulkEditActions.openActions();
            BulkEditActions.downloadChangedCSV();
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              changedRecordsQueryFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.BARCODE,
              user.barcode,
              editedColumnValuesInFile,
            );

            // Step 16: Navigate to "Users" app => Search for edited Users => Verify changes
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
            UsersSearchPane.searchByUsername(user.username);
            UsersSearchPane.openUser(user.username);
            UsersCard.openContactInfo();
            UsersCard.verifyEmail(newEmail);
            UsersCard.verifyPatronBlockValue('faculty');
            UsersCard.verifyExpirationDate(futureDate);
          });
        },
      );
    });
  });
});
