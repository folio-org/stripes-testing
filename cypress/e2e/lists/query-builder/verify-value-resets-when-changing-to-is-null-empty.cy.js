import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  QUERY_OPERATIONS,
  organizationFieldValues,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import SelectOrganizationModal from '../../../support/fragments/orders/modals/selectOrganizationModal';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const listName = `AT_C651409_List_${getRandomPostfix()}`;
const testData = {
  organization: {},
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getOrganizationsByStatus('Active').then((response) => {
          testData.organization = response.body.organizations[0];
        });

        cy.login(user.username, user.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C651409 Verify that the value resets after changing the operator from equals to null/empty and vice versa (corsair)',
      { tags: ['criticalPath', 'corsair', 'C651409'] },
      () => {
        // Step 1: Create new list with Organizations record type and open Build query form
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.selectRecordType(Lists.recordTypes.organizations);
        Lists.buildQuery();
        QueryModal.verify();
        QueryModal.verifyQueryTextboxReadOnly();
        QueryModal.verifyQueryTextboxResizable();

        // Step 2: Select Organization Code field, equals operator, and select organization from modal
        QueryModal.selectField(organizationFieldValues.code);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.clickOrganizationLookup();
        SelectOrganizationModal.findOrganization(testData.organization.name);
        QueryModal.verifyQueryAreaContent(`(organization.code == ${testData.organization.code})`);

        // Step 3: Change operator from "equals" to "is null/empty" - value SHOULD reset
        QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
        QueryModal.verifySelectedValue('Select value');
        QueryModal.verifyQueryAreaContent('(organization.code  is null/empty )');
        QueryModal.verifyQueryAreaDoesNotContain(testData.organization.code);
      },
    );
  });
});
