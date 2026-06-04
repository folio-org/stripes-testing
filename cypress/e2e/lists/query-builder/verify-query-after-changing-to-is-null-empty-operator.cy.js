import { v4 as uuid } from 'uuid';
import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  instanceFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const recordType = 'Instances';
const listName = `AT_C651430_List_${getRandomPostfix()}`;
const testData = {
  randomUuid: uuid(),
};
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
      'C651430 Verify that the user friendly query is correct, after changing from any operator to is null/empty (corsair)',
      { tags: ['criticalPath', 'corsair', 'C651430'] },
      () => {
        // Step 1: Create new list with Instances record type and open Build query form
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.selectRecordType(recordType);
        Lists.buildQuery();
        QueryModal.verify();
        QueryModal.verifyQueryTextboxReadOnly();
        QueryModal.verifyQueryTextboxResizable();

        // Step 2: Select Instance UUID field, equals operator, and add random UUID
        QueryModal.selectField(instanceFieldValues.instanceId);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.fillInValueTextfield(testData.randomUuid);
        QueryModal.verifyTextFieldValue(testData.randomUuid);
        QueryModal.verifyQueryAreaContent(`(instance.id == ${testData.randomUuid})`);

        // Step 3: Change operator from "equals" to "is null/empty"
        QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
        QueryModal.verifySelectedValue('Select value');
        QueryModal.verifyQueryAreaContent('(instance.id  is null/empty )');
      },
    );
  });
});
