import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  usersFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const listName = `AT_C651411_List_${getRandomPostfix()}`;
const testData = {
  patronGroups: [],
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    before('Create test user and login', () => {
      cy.createTempUser([Permissions.listsAll.gui, Permissions.usersViewRequests.gui]).then(
        (userProperties) => {
          user = userProperties;

          cy.getPatronGroupsApi({ limit: 3 }).then((patronGroups) => {
            testData.patronGroups = patronGroups;
          });

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
      'C651411 Verify that changing operator from "comparison array" to "comparison" keeps the first value (corsair)',
      { tags: ['criticalPath', 'corsair', 'C651411'] },
      () => {
        // Step 1: Create new list with Users record type and open Build query form
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.selectRecordType(Lists.recordTypes.users);
        Lists.buildQuery();
        QueryModal.verifyQueryTextboxReadOnly();
        QueryModal.verifyQueryTextboxResizable();

        // Step 2: Select Patron group field, IN operator, and select 3 patron groups
        QueryModal.selectField(usersFieldValues.patronGroup);
        QueryModal.selectOperator(QUERY_OPERATIONS.IN);
        QueryModal.chooseFromValueMultiselect(testData.patronGroups[0].group, 0, {
          exactMatch: true,
        });
        QueryModal.chooseFromValueMultiselect(testData.patronGroups[1].group, 0, {
          exactMatch: true,
        });
        QueryModal.chooseFromValueMultiselect(testData.patronGroups[2].group, 0, {
          exactMatch: true,
        });
        QueryModal.verifySelectedMultiselectValue([
          testData.patronGroups[0].group,
          testData.patronGroups[1].group,
          testData.patronGroups[2].group,
        ]);
        QueryModal.verifyQueryAreaContent(
          `(groups.group in [${testData.patronGroups[0].group}, ${testData.patronGroups[1].group}, ${testData.patronGroups[2].group}])`,
        );

        // Step 3: Change operator from "IN" to "equals" - only first value should remain
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.verifySelectedValue(testData.patronGroups[0].group);
        QueryModal.verifyQueryAreaContent(`(groups.group == ${testData.patronGroups[0].group})`);

        // Step 4: Change operator from "equals" to "NOT IN" - value should NOT reset
        QueryModal.selectOperator(QUERY_OPERATIONS.NOT_IN);
        QueryModal.verifySelectedMultiselectValue([testData.patronGroups[0].group]);
        QueryModal.verifyQueryAreaContent(
          `(groups.group not in [${testData.patronGroups[0].group}])`,
        );
      },
    );
  });
});
