import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  instanceFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const listName = `AT_C651406_List_${getRandomPostfix()}`;
const testValue = 'Test';
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    before('Create test user and login', () => {
      cy.createTempUser([Permissions.listsAll.gui, Permissions.inventoryAll.gui]).then(
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
      'C651406 Verify that the value remains populated after changing the operator from equals to not equal to (corsair)',
      { tags: ['criticalPath', 'corsair', 'C651406'] },
      () => {
        // Step 1: Create new list with Instances record type and open Build query form
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.selectRecordType(Lists.recordTypes.instances);
        Lists.buildQuery();
        QueryModal.verifyQueryTextboxReadOnly();
        QueryModal.verifyQueryTextboxResizable();

        // Step 2: Select Instance status Code field, equals operator, and enter test value
        QueryModal.selectField(instanceFieldValues.instanceStatusCode);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.fillInValueTextfield(testValue);
        QueryModal.verifyTextFieldValue(testValue);
        QueryModal.verifyQueryAreaContent(`(inst_stat.code == ${testValue})`);

        // Step 3: Change operator from "equals" to "not equal to" - value should NOT reset
        QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL);
        QueryModal.verifyTextFieldValue(testValue);
        QueryModal.verifyQueryAreaContent(`(inst_stat.code != ${testValue})`);
      },
    );
  });
});
