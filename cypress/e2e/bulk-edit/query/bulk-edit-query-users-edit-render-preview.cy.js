import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import QueryModal, {
  QUERY_OPERATIONS,
  usersFieldValues,
} from '../../../support/fragments/bulk-edit/query-modal';
import { patronGroupNames, patronGroupUuids } from '../../../support/constants';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import FileManager from '../../../support/utils/fileManager';

let user;
const matchedRecordsFileName = '*-Matched-Records-Query-*';

describe('bulk-edit', () => {
  describe('query', () => {
    before('create test data', () => {
      cy.getAdminToken();
      cy.createTempUser(
        [
          permissions.bulkEditUpdateRecords.gui,
          permissions.uiUserEdit.gui,
          permissions.bulkEditQueryView.gui,
        ],
        patronGroupNames.STAFF,
      ).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName);
    });

    it(
      'C440079 Render preview after query executed (Users - Edit In app) (firebird)',
      { tags: ['criticalPath', 'firebird'] },
      () => {
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.clickBuildQueryButton();
        QueryModal.verify();
        QueryModal.verifyFieldsSortedAlphabetically();
        QueryModal.selectField(usersFieldValues.patronGroup);
        QueryModal.verifySelectedField(usersFieldValues.patronGroup);
        QueryModal.verifyQueryAreaContent('(user_patron_group  )');
        QueryModal.verifyOperatorColumn();
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.verifyQueryAreaContent('(user_patron_group == )');
        QueryModal.verifyValueColumn();
        QueryModal.chooseValueSelect(patronGroupNames.STAFF);
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled();
        QueryModal.verifyQueryAreaContent(`(user_patron_group == "${patronGroupUuids.STAFF}")`);
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled();
        QueryModal.clickTestQuery();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.clickRunQuery();
        QueryModal.verifyClosed();
        BulkEditSearchPane.verifySpecificTabHighlighted('Query');
        BulkEditSearchPane.isBuildQueryButtonDisabled();
        BulkEditSearchPane.isUsersRadioChecked(true);
        BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false);
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [user.username]);
      },
    );
  });
});
