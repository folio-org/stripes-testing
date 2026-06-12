import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  usersFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import getRandomPostfix from '../../../support/utils/stringTools';

const listName = `AT_C651410_List_${getRandomPostfix()}`;
const testData = {
  currentDate: DateTools.getCurrentDate(),
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    before('Create test user and login', () => {
      cy.createTempUser([Permissions.listsAll.gui, Permissions.usersViewRequests.gui]).then(
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
      Users.deleteViaApi(user.userId);
    });

    it(
      "C651410 Verify that changing operator from 'comparison' to 'comparison array' doesn't reset value (corsair)",
      { tags: ['extendedPath', 'corsair', 'C651410'] },
      () => {
        // Step 1: Create new list with Users record type and open Build query form
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.selectRecordType(Lists.recordTypes.users);
        Lists.buildQuery();
        QueryModal.verifyQueryTextboxReadOnly();
        QueryModal.verifyQueryTextboxResizable();

        // Step 2: Select User created date field, less than operator, and select current date
        QueryModal.selectField(usersFieldValues.userCreatedDate);
        QueryModal.selectOperator(QUERY_OPERATIONS.LESS_THAN);
        QueryModal.pickDate(testData.currentDate);
        QueryModal.verifyTextFieldValue(testData.currentDate);
        QueryModal.verifyQueryAreaContent(`(users.user_created_date < ${testData.currentDate})`);

        // Step 3: Change operator from "less than" to "equals" - date should NOT reset
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.verifyTextFieldValue(testData.currentDate);
        QueryModal.verifyQueryAreaContent(`(users.user_created_date == ${testData.currentDate})`);

        // Step 4: Change operator from "equals" to "greater than or equal to" - date should NOT reset
        QueryModal.selectOperator(QUERY_OPERATIONS.GREATER_THAN_OR_EQUAL_TO);
        QueryModal.verifyTextFieldValue(testData.currentDate);
        QueryModal.verifyQueryAreaContent(`(users.user_created_date >= ${testData.currentDate})`);
      },
    );
  });
});
