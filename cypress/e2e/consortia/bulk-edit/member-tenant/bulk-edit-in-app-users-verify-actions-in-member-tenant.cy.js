import permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import QueryModal, {
  QUERY_OPERATIONS,
  usersFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';
import UsersCard from '../../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import DateTools from '../../../../support/utils/dateTools';

let user;
let matchedRecordsQueryFileName;
let previewQueryFileName;
let changedRecordsQueryFileName;
const userPermissions = [
  permissions.bulkEditUpdateRecords.gui,
  permissions.bulkEditQueryView.gui,
  permissions.bulkEditCsvEdit.gui,
  permissions.uiUserEdit.gui,
];
const newExpirationDate = new Date();
const newExpirationDateWithSlashes = DateTools.getFormattedDateWithSlashes({
  date: new Date(),
});
const newExpirationDateInFile = `${DateTools.getFormattedDate({ date: newExpirationDate })}`;
const newPatronGroup = 'faculty';

describe('Bulk-edit', () => {
  describe('Member tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        cy.createTempUser(userPermissions).then((userProperties) => {
          user = userProperties;

          cy.resetTenant();
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
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
          cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
          cy.intercept('GET', '/query/**').as('waiterForQueryCompleted');
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryCompleted('@waiterForQueryCompleted');
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(user.userId);
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsQueryFileName,
          previewQueryFileName,
          changedRecordsQueryFileName,
        );
      });

      it(
        'C566179 Verify bulk edit actions for Users in Member tenant - Query (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C566179'] },
        () => {
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
            BulkEditSearchPane.verifyQueryHeadLine(
              `(users.type == staff) AND (users.last_name == ${user.personal.lastName})`,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              user.barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.BARCODE,
              user.barcode,
            );
            BulkEditSearchPane.verifyPaginatorInMatchedRecords(1);
            BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false);
            BulkEditActions.startBulkEditLocalAbsent();
            BulkEditActions.openActions();
            BulkEditActions.downloadMatchedResults();
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsQueryFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              user.userId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              user.userId,
            );
            BulkEditActions.openStartBulkEditForm();
            BulkEditActions.verifyBulkEditsAccordionExists();
            BulkEditActions.verifyOptionsDropdown();
            BulkEditActions.verifyRowIcons();
            BulkEditActions.verifyCancelButtonDisabled(false);
            BulkEditActions.verifyConfirmButtonDisabled(true);

            const oldEmail = user.personal.email;
            const newEmail = 'new_email@google.com';

            BulkEditActions.replaceEmail(oldEmail, newEmail);
            BulkEditActions.verifyConfirmButtonDisabled(false);
            BulkEditActions.addNewBulkEditFilterString();
            BulkEditActions.verifyNewBulkEditRow(1);
            BulkEditActions.selectOption('Expiration date', 1);
            BulkEditActions.fillExpirationDate(newExpirationDate, 1);
            BulkEditActions.verifyConfirmButtonDisabled(false);
            BulkEditActions.addNewBulkEditFilterString();
            BulkEditActions.fillPatronGroup('faculty (Faculty Member)', 2);
            BulkEditActions.verifyConfirmButtonDisabled(false);
            BulkEditActions.confirmChanges();
            BulkEditActions.verifyMessageBannerInAreYouSureForm(1);

            const editedColumnValues = [
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EMAIL,
                value: newEmail,
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.PATRON_GROUP,
                value: newPatronGroup,
              },
            ];

            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              user.barcode,
              editedColumnValues,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              user.barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EXPIRATION_DATE,
              newExpirationDateWithSlashes,
            );
            BulkEditActions.verifyAreYouSureForm(1);
            BulkEditSearchPane.verifyPaginatorInMatchedRecords(1);
            BulkEditActions.downloadPreview();
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              previewQueryFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              user.userId,
              editedColumnValues,
            );
            BulkEditFiles.verifyValueInRowByUUID(
              previewQueryFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              user.userId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EXPIRATION_DATE,
              newExpirationDateInFile,
            );
            BulkEditActions.commitChanges();
            BulkEditActions.verifySuccessBanner(1);
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
              user.barcode,
              editedColumnValues,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
              user.barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EXPIRATION_DATE,
              newExpirationDateWithSlashes,
            );
            BulkEditActions.openActions();
            BulkEditActions.downloadChangedCSV();
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              changedRecordsQueryFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              user.userId,
              editedColumnValues,
            );
            BulkEditFiles.verifyValueInRowByUUID(
              changedRecordsQueryFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              user.userId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EXPIRATION_DATE,
              newExpirationDateInFile,
            );

            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
            UsersSearchPane.searchByUsername(user.username);
            Users.verifyPatronGroupOnUserDetailsPane(newPatronGroup);
            UsersSearchPane.openUser(user.username);
            UsersCard.verifyExpirationDate(newExpirationDate);
            UsersCard.verifyEmail(newEmail);
          });
        },
      );
    });
  });
});
