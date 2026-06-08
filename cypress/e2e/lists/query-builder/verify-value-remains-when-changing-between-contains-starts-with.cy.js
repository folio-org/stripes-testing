import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  holdingsFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const listName = `AT_C651407_List_${getRandomPostfix()}`;
const testValue = 'Test data';
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
      'C651407 Verify that the value remains populated after changing the operator from contains to starts with and vice versa (corsair)',
      { tags: ['criticalPath', 'corsair', 'C651407'] },
      () => {
        // Step 1: Create new list with Holdings record type and open Build query form
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.selectRecordType(Lists.recordTypes.holdings);
        Lists.buildQuery();
        QueryModal.verify();
        QueryModal.verifyQueryTextboxReadOnly();
        QueryModal.verifyQueryTextboxResizable();

        // Step 2: Select Holdings Call number field, Contains operator, and enter test value
        QueryModal.selectField(holdingsFieldValues.callNumber);
        QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);
        QueryModal.fillInValueTextfield(testValue);
        QueryModal.verifyTextFieldValue(testValue);
        QueryModal.verifyQueryAreaContent(`(holdings.call_number contains ${testValue})`);

        // Step 3: Change operator from "Contains" to "Starts with" - value should NOT reset
        QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
        QueryModal.verifyTextFieldValue(testValue);
        QueryModal.verifyQueryAreaContent(`(holdings.call_number starts with ${testValue})`);

        // Step 4: Change operator from "Starts with" to "Contains" - value should NOT reset
        QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);
        QueryModal.verifyTextFieldValue(testValue);
        QueryModal.verifyQueryAreaContent(`(holdings.call_number contains ${testValue})`);
      },
    );
  });
});
