import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  organizationFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const listName = `AT_C648455_List_${getRandomPostfix()}`;
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    before('Create test user and login', () => {
      cy.createTempUser([Permissions.listsAll.gui, Permissions.uiOrganizationsView.gui]).then(
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
      "C648455 Verify that it's possible to remove the first query parameter in the QB (corsair)",
      { tags: ['criticalPath', 'corsair', 'C648455'] },
      () => {
        // Step 1: Create new list with Organizations record type
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.selectRecordType(Lists.recordTypes.organizations);
        Lists.buildQuery();
        QueryModal.verify();

        // Step 2: Build query form is opened
        QueryModal.verifyQueryTextboxReadOnly();
        QueryModal.verifyQueryTextboxResizable();

        // Step 3: Configure first query parameter with Organization Code, is null/empty, True
        QueryModal.selectField(organizationFieldValues.code);
        QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
        QueryModal.selectValueFromSelect('True');
        QueryModal.testQueryDisabled(false);
        QueryModal.verifyPlusAndTrashButtonsDisabled(0, false, true);

        // Step 4: Add second query parameter
        QueryModal.addNewRow();
        QueryModal.testQueryDisabled(true);
        QueryModal.verifyBooleanColumn(1);
        QueryModal.verifyPlusAndTrashButtonsDisabled(0, false, false);
        cy.wait(500);

        // Step 5: Delete first query parameter
        QueryModal.clickGarbage(0);
        QueryModal.verifyPlusAndTrashButtonsDisabled(0, false, true);
        QueryModal.verifyBooleanColumnAbsent();
        QueryModal.verifySelectedField('');
        QueryModal.verifyQueryAreaContent('');
      },
    );
  });
});
