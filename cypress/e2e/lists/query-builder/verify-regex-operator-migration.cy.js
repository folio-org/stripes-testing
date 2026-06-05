import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  QUERY_OPERATIONS,
  usersFieldValues,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const testData = {
  listName: `AT_C831960_List_${getRandomPostfix()}`,
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    before('Create test user, login and create list with query using both operators', () => {
      cy.createTempUser([Permissions.listsAll.gui]).then((userProperties) => {
        user = userProperties;

        cy.loginAsAdmin({
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        Lists.openNewListPane();
        Lists.setName(testData.listName);
        Lists.selectRecordType(Lists.recordTypes.users);
        Lists.buildQuery();
        QueryModal.selectField(usersFieldValues.userName);
        QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
        QueryModal.fillInValueTextfield(user.username);
        QueryModal.addNewRow();
        QueryModal.selectField(usersFieldValues.userEmail, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS, 1);
        QueryModal.fillInValueTextfield('test', 1);
        QueryModal.testQuery();
        QueryModal.clickRunQueryAndSave();
        Lists.verifySuccessCalloutMessage(`List ${testData.listName} saved.`);
        QueryModal.verifyClosed();
        Lists.waitForCompilingToComplete();
        Lists.closeListDetailsPane();
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Lists.deleteListByNameViaApi(testData.listName, true);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C831960 Verify that the migration of existing Lists with Regex Operator is successful (corsair)',
      { tags: ['extendedPath', 'corsair', 'C831960'] },
      () => {
        // Step 1: Open list and verify fqlQuery
        cy.intercept('GET', '**/lists/*').as('getListDetails');

        Lists.selectList(testData.listName);

        cy.wait('@getListDetails').then((interception) => {
          const fqlQuery = interception.response.body.fqlQuery;

          // Step 2: Verify no $regex in fqlQuery
          expect(fqlQuery).to.not.include('$regex');

          // Verify $starts_with exists
          expect(fqlQuery).to.include('$starts_with');

          // Verify $contains exists
          expect(fqlQuery).to.include('$contains');
        });
      },
    );
  });
});
