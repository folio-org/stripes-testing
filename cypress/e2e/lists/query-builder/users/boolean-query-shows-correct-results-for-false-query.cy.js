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

const testCaseId = 'C627548';
const currentDate = DateTools.getCurrentDate();
const listData = {
  name: `AT_${testCaseId}_List_${getRandomPostfix()}`,
};
let user;
let inactiveUser;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Users', () => {
      before('Create test data and login', () => {
        cy.createTempUser([]).then((userProperties) => {
          inactiveUser = userProperties;
          cy.getUsers({ limit: 1, query: `"id"="${inactiveUser.userId}"` }).then((users) => {
            const userData = users[0];
            userData.active = false;
            cy.updateUser(userData);
          });
        });

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
        cy.getAdminToken();
        Users.deleteViaApi(inactiveUser.userId);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C627548 Boolean query shows correct results for false query (athena)',
        { tags: ['criticalPath', 'athena', 'C627548'] },
        () => {
          // Step 1: Open new list pane and fill in list details
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
          QueryModal.verifyPlusAndTrashButtonsDisabled(0, false, true);

          // Step 3: Select "User — Active" field
          QueryModal.selectField(usersFieldValues.userActive);
          QueryModal.verifySelectedField(usersFieldValues.userActive);
          QueryModal.verifyQueryAreaContent('(users.active  )');
          QueryModal.verifyOperatorColumn();

          // Step 4: Select "equals" operator
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifyQueryAreaContent('(users.active == )');
          QueryModal.verifyValueColumn();

          // Step 5: Choose "False" value
          QueryModal.chooseValueSelect('False');
          QueryModal.verifySelectedValue('False');
          QueryModal.verifyQueryAreaContent('(users.active == False)');
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled();

          // Add second filter — User created date equals today
          QueryModal.addNewRow(0);
          QueryModal.selectField(usersFieldValues.userCreatedDate, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.pickDate(currentDate, 1);

          // Step 6: Click "Test query" button
          QueryModal.clickTestQuery();
          QueryModal.testQueryDisabled(true);
          QueryModal.runQueryDisabled();

          // Step 7: Wait for query test to finish and verify preview
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();

          // Step 8: Verify inactive user appears in results with active = false
          QueryModal.verifyMatchedRecordsByIdentifier(
            inactiveUser.barcode,
            usersFieldValues.userActive,
            'False',
          );
        },
      );
    });
  });
});
