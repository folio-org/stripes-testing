import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  usersFieldValues,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

const testCaseId = 'C991328';
const yesterdayDate = DateTools.getPreviousDayDate();
const tomorrowDate = DateTools.getTomorrowDayDateForFiscalYear();
const listData = {
  name: `AT_${testCaseId}_List_${getRandomPostfix()}`,
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Users', () => {
      before('Create test data and login', () => {
        cy.clearLocalStorage();
        cy.createTempUser([Permissions.listsEdit.gui, Permissions.usersViewRequests.gui]).then(
          (userProperties) => {
            user = userProperties;
            cy.login(user.username, user.password, {
              path: TopMenu.listsPath,
              waiter: Lists.waitLoading,
            });
          },
        );
      });

      after('Delete test data', () => {
        cy.getUserToken(user.username, user.password);
        Lists.deleteListByNameViaApi(listData.name);
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
      });

      it(
        'C991328 Verify "User created date" and "User updated date" fields are queryable (athena)',
        { tags: ['criticalPath', 'athena', 'C991328'] },
        () => {
          // Step 1: Open new list pane, set name, and select Users record type
          Lists.openNewListPane();
          Lists.setName(listData.name);
          Lists.selectRecordType(Lists.recordTypes.users);
          Lists.verifySaveButtonIsActive();
          Lists.verifyCancelButtonIsActive();

          // Step 2: Open query builder and verify initial state
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.verifyQueryTextboxResizable();

          // Step 3: Select "User — User created date" field in row 0, apply "greater than" operator, and pick date
          QueryModal.selectField(usersFieldValues.userCreatedDate, 0);
          QueryModal.verifySelectedField(usersFieldValues.userCreatedDate, 0);
          QueryModal.selectOperator(QUERY_OPERATIONS.GREATER_THAN, 0);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.GREATER_THAN, 0);
          QueryModal.pickDate(yesterdayDate, 0);
          QueryModal.addNewRow(0);
          QueryModal.selectField(usersFieldValues.userUpdatedDate, 1);
          QueryModal.verifySelectedField(usersFieldValues.userUpdatedDate, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.LESS_THAN, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.LESS_THAN, 1);
          QueryModal.pickDate(tomorrowDate, 1);
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled();
          QueryModal.clickTestQuery();
          QueryModal.verifyMatchedRecordsByIdentifier(
            user.barcode,
            usersFieldValues.userActive,
            'True',
          );
        },
      );
    });
  });
});
