import { ITEM_STATUS_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  itemFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const listName = `AT_C651408_List_${getRandomPostfix()}`;
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
      'C651408 Verify that the value remains populated after changing the operator from IN to NOT IN and vice versa (corsair)',
      { tags: ['criticalPath', 'corsair', 'C651408'] },
      () => {
        // Step 1: Create new list with Items record type and open Build query form
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.selectRecordType(Lists.recordTypes.items);
        Lists.buildQuery();
        QueryModal.verifyQueryTextboxReadOnly();
        QueryModal.verifyQueryTextboxResizable();

        // Step 2: Select Items Status field, IN operator, and select several status values
        QueryModal.selectField(itemFieldValues.itemStatus);
        QueryModal.selectOperator(QUERY_OPERATIONS.IN);
        QueryModal.chooseFromValueMultiselect(ITEM_STATUS_NAMES.AVAILABLE, 0, { exactMatch: true });
        QueryModal.chooseFromValueMultiselect(ITEM_STATUS_NAMES.CHECKED_OUT, 0, {
          exactMatch: true,
        });
        QueryModal.chooseFromValueMultiselect(ITEM_STATUS_NAMES.IN_TRANSIT, 0, {
          exactMatch: true,
        });
        QueryModal.verifySelectedMultiselectValue([
          ITEM_STATUS_NAMES.AVAILABLE,
          ITEM_STATUS_NAMES.CHECKED_OUT,
          ITEM_STATUS_NAMES.IN_TRANSIT,
        ]);
        QueryModal.verifyQueryAreaContent(
          `(items.status_name in [${ITEM_STATUS_NAMES.AVAILABLE}, ${ITEM_STATUS_NAMES.CHECKED_OUT}, ${ITEM_STATUS_NAMES.IN_TRANSIT}])`,
        );

        // Step 3: Change operator from "IN" to "NOT IN" - values should NOT reset
        QueryModal.selectOperator(QUERY_OPERATIONS.NOT_IN);
        QueryModal.verifySelectedMultiselectValue([
          ITEM_STATUS_NAMES.AVAILABLE,
          ITEM_STATUS_NAMES.CHECKED_OUT,
          ITEM_STATUS_NAMES.IN_TRANSIT,
        ]);
        QueryModal.verifyQueryAreaContent(
          `(items.status_name not in [${ITEM_STATUS_NAMES.AVAILABLE}, ${ITEM_STATUS_NAMES.CHECKED_OUT}, ${ITEM_STATUS_NAMES.IN_TRANSIT}])`,
        );

        // Step 4: Change operator from "NOT IN" to "IN" - values should NOT reset
        QueryModal.selectOperator(QUERY_OPERATIONS.IN);
        QueryModal.verifySelectedMultiselectValue([
          ITEM_STATUS_NAMES.AVAILABLE,
          ITEM_STATUS_NAMES.CHECKED_OUT,
          ITEM_STATUS_NAMES.IN_TRANSIT,
        ]);
        QueryModal.verifyQueryAreaContent(
          `(items.status_name in [${ITEM_STATUS_NAMES.AVAILABLE}, ${ITEM_STATUS_NAMES.CHECKED_OUT}, ${ITEM_STATUS_NAMES.IN_TRANSIT}])`,
        );
      },
    );
  });
});
