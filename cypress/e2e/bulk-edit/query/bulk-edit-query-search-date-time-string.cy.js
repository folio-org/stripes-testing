import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import QueryModal, {
  QUERY_OPERATIONS,
  STRING_OPERATORS,
  dateTimeOperators,
  usersFieldValues,
} from '../../../support/fragments/bulk-edit/query-modal';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';

let user;

describe('bulk-edit', () => {
  describe('query', () => {
    before('create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        permissions.bulkEditUpdateRecords.gui,
        permissions.uiUserEdit.gui,
        permissions.bulkEditQueryView.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.getUsers({ limit: 1, query: `username=${user.username}` }).then((users) => {
          cy.updateUser({
            ...users[0],
            expirationDate: DateTools.getTomorrowDay(),
          });
        });
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
      'C651594 Query builder - Search users with expiration date in specified date range and first name, last name containing specific letters ("Date-time" and "String" property types) (firebird)',
      { tags: ['smoke', 'firebird', 'C651594'] },
      () => {
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.clickBuildQueryButton();
        QueryModal.verify();
        QueryModal.verifyFieldsSortedAlphabetically();
        QueryModal.clickSelectFieldButton();
        QueryModal.selectField(usersFieldValues.expirationDate);
        QueryModal.verifySelectedField(usersFieldValues.expirationDate);
        QueryModal.verifyQueryAreaContent('(users.expiration_date  )');
        QueryModal.verifyOperatorColumn();
        QueryModal.selectOperator('greater than or equal to');
        QueryModal.verifyOperatorsList(dateTimeOperators);
        QueryModal.verifyQueryAreaContent('(users.expiration_date >= )');
        QueryModal.verifyValueColumn();
        const todayDate = DateTools.getCurrentDate();
        QueryModal.pickDate(todayDate);
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled();
        QueryModal.addNewRow();
        QueryModal.verifyBooleanColumn();
        QueryModal.verifyEmptyField(1);
        QueryModal.verifyEmptyOperator(1);
        QueryModal.verifyEmptyValue(1);
        QueryModal.verifyPlusAndTrashButtonsDisabled(1, false, false);
        QueryModal.verifyPlusAndTrashButtonsDisabled(0, false, true);
        QueryModal.verifyQueryAreaContent(`(users.expiration_date >= "${todayDate}") AND (  )`);
        QueryModal.testQueryDisabled();
        QueryModal.runQueryDisabled();
        QueryModal.typeInAndSelectField(usersFieldValues.expirationDate, 1);
        QueryModal.selectOperator('less than or equal to', 1);
        QueryModal.verifyValueColumn();
        const nextWeekDate = DateTools.get2DaysAfterTomorrowDateForFiscalYearOnUIEdit();
        QueryModal.pickDate(nextWeekDate, 1);
        QueryModal.verifyQueryAreaContent(
          `(users.expiration_date >= "${todayDate}") AND (users.expiration_date <= "${nextWeekDate}")`,
        );
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled();
        QueryModal.addNewRow(1);
        QueryModal.verifyBooleanColumn(2);
        QueryModal.verifyEmptyField(2);
        QueryModal.verifyEmptyOperator(2);
        QueryModal.verifyEmptyValue(2);
        QueryModal.verifyPlusAndTrashButtonsDisabled(0, false, true);
        QueryModal.testQueryDisabled();
        QueryModal.runQueryDisabled();
        QueryModal.selectField(usersFieldValues.lastName, 2);
        QueryModal.verifySelectedField(usersFieldValues.lastName, 2);
        QueryModal.verifyQueryAreaContent(
          `(users.expiration_date >= "${todayDate}") AND (users.expiration_date <= "${nextWeekDate}") AND (users.last_name  )`,
        );
        QueryModal.testQueryDisabled();
        QueryModal.runQueryDisabled();
        QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH, 2);
        QueryModal.verifyOperatorsList(STRING_OPERATORS, 2);
        QueryModal.verifyQueryAreaContent(
          `(users.expiration_date >= "${todayDate}") AND (users.expiration_date <= "${nextWeekDate}") AND (users.last_name starts with )`,
        );
        QueryModal.fillInValueTextfield('cypressTestUser', 2);
        QueryModal.verifyQueryAreaContent(
          `(users.expiration_date >= "${todayDate}") AND (users.expiration_date <= "${nextWeekDate}") AND (users.last_name starts with "cypressTestUser")`,
        );
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled();
        QueryModal.addNewRow(2);
        QueryModal.verifyBooleanColumn(3);
        QueryModal.verifyEmptyField(3);
        QueryModal.verifyEmptyOperator(3);
        QueryModal.verifyEmptyValue(3);
        QueryModal.verifyPlusAndTrashButtonsDisabled(0, false, true);
        QueryModal.testQueryDisabled();
        QueryModal.runQueryDisabled();
        QueryModal.selectField(usersFieldValues.firstName, 3);
        QueryModal.verifySelectedField(usersFieldValues.firstName, 3);
        QueryModal.testQueryDisabled();
        QueryModal.runQueryDisabled();
        QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS, 3);
        QueryModal.fillInValueTextfield('testPermFirst', 3);
        QueryModal.verifyQueryAreaContent(
          `(users.expiration_date >= "${todayDate}") AND (users.expiration_date <= "${nextWeekDate}") AND (users.last_name starts with "cypressTestUser") AND (users.first_name contains "testPermFirst")`,
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
