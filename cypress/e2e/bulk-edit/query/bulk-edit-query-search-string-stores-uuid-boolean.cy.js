import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import QueryModal, {
  usersFieldValues,
  stringStoresUuidOperators,
  booleanOperators,
} from '../../../support/fragments/bulk-edit/query-modal';
import { patronGroupNames, patronGroupUuids } from '../../../support/constants';

let user;

describe('bulk-edit', () => {
  describe('query', () => {
    before('create test data', () => {
      cy.getAdminToken();
      cy.createTempUser(
        [
          permissions.bulkEditUpdateRecords.gui,
          permissions.uiUsersView.gui,
          permissions.bulkEditQueryView.gui,
        ],
        patronGroupNames.UNDERGRAD,
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
    });

    it(
      'C471490 Query builder - Search users that belong to a specific patron group and have "Active" status ("String stores UUID" and "Boolean" property types) (firebird)',
      { tags: ['smoke', 'firebird'] },
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
        QueryModal.selectOperator('==');
        QueryModal.verifyOperatorsList(stringStoresUuidOperators);
        QueryModal.verifyQueryAreaContent('(user_patron_group == )');
        QueryModal.verifyValueColumn();
        QueryModal.chooseValueSelect(patronGroupNames.STAFF);
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled();
        QueryModal.verifyQueryAreaContent(`(user_patron_group == "${patronGroupUuids.STAFF}")`);
        QueryModal.selectOperator('!=');
        QueryModal.testQueryDisabled();
        QueryModal.runQueryDisabled();
        QueryModal.verifyQueryAreaContent('(user_patron_group != )');
        QueryModal.verifyValueColumn();
        QueryModal.selectOperator('in');
        QueryModal.verifyQueryAreaContent('(user_patron_group in )');
        QueryModal.verifyValueColumn();
        QueryModal.fillInValueMultiselect(patronGroupNames.STAFF);
        QueryModal.verifyQueryAreaContent(`(user_patron_group in "${patronGroupUuids.STAFF}")`);
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled();
        QueryModal.chooseFromValueMultiselect(patronGroupNames.FACULTY);
        QueryModal.verifyQueryAreaContent(
          `(user_patron_group in "${patronGroupUuids.STAFF}","${patronGroupUuids.FACULTY}")`,
        );
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled();
        QueryModal.removeValueFromMultiselect(patronGroupNames.STAFF);
        QueryModal.removeValueFromMultiselect(patronGroupNames.FACULTY);
        QueryModal.verifyQueryAreaContent('(user_patron_group in )');
        QueryModal.testQueryDisabled();
        QueryModal.runQueryDisabled();
        QueryModal.chooseFromValueMultiselect(patronGroupNames.UNDERGRAD);
        QueryModal.verifyQueryAreaContent(`(user_patron_group in "${patronGroupUuids.UNDERGRAD}")`);
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled();
        QueryModal.addNewRow();
        QueryModal.verifyBooleanColumn();
        QueryModal.verifyEmptyField(1);
        QueryModal.verifyEmptyOperator(1);
        QueryModal.verifyEmptyValue(1);
        QueryModal.verifyPlusAndTrashButtonsDisabled(1, false, false);
        QueryModal.verifyPlusAndTrashButtonsDisabled(0, false, true);
        QueryModal.verifyQueryAreaContent(
          `(user_patron_group in "${patronGroupUuids.UNDERGRAD}") AND (  )`,
        );
        QueryModal.testQueryDisabled();
        QueryModal.runQueryDisabled();
        QueryModal.selectField(usersFieldValues.userActive, 1);
        QueryModal.verifySelectedField(usersFieldValues.userActive, 1);
        QueryModal.verifyOperatorsList(booleanOperators, 1);
        QueryModal.selectOperator('==', 1);
        QueryModal.verifyQueryAreaContent(
          `(user_patron_group in "${patronGroupUuids.UNDERGRAD}") AND (user_active == )`,
        );
        QueryModal.verifyValueColumn();
        QueryModal.testQueryDisabled();
        QueryModal.runQueryDisabled();
        QueryModal.selectValueFromSelect('True', 1);
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled();
        QueryModal.verifyQueryAreaContent(
          `(user_patron_group in "${patronGroupUuids.UNDERGRAD}") AND (user_active == "true")`,
        );
        QueryModal.addNewRow(1);
        QueryModal.verifyBooleanColumn(2);
        QueryModal.verifyEmptyField(2);
        QueryModal.verifyEmptyOperator(2);
        QueryModal.verifyEmptyValue(2);
        QueryModal.verifyPlusAndTrashButtonsDisabled(0, false, true);
        QueryModal.testQueryDisabled();
        QueryModal.runQueryDisabled();
        QueryModal.selectField(usersFieldValues.userActive, 2);
        QueryModal.verifySelectedField(usersFieldValues.userActive, 2);
        QueryModal.verifyOperatorsList(booleanOperators, 2);
        QueryModal.selectOperator('!=', 2);
        QueryModal.verifyQueryAreaContent(
          `(user_patron_group in "${patronGroupUuids.UNDERGRAD}") AND (user_active == "true") AND (user_active != )`,
        );
        QueryModal.verifyValueColumn();
        QueryModal.testQueryDisabled();
        QueryModal.runQueryDisabled();
        QueryModal.selectValueFromSelect('False', 2);
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled();
        QueryModal.verifyQueryAreaContent(
          `(user_patron_group in "${patronGroupUuids.UNDERGRAD}") AND (user_active == "true") AND (user_active != "false")`,
        );
        QueryModal.clickGarbage(2);
        QueryModal.verifyQueryAreaContent(
          `(user_patron_group in "${patronGroupUuids.UNDERGRAD}") AND (user_active == "true")`,
        );
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled();
        QueryModal.clickTestQuery();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.clickRunQuery();
        QueryModal.verifyClosed();
        BulkEditSearchPane.verifySpecificTabHighlighted('Query');
      },
    );
  });
});
