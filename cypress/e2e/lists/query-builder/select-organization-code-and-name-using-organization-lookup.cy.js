import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  QUERY_OPERATIONS,
  organizationFieldValues,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import SelectOrganizationModal from '../../../support/fragments/orders/modals/selectOrganizationModal';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const testCaseId = 'C740213';
const listName = `AT_${testCaseId}_List_${getRandomPostfix()}`;
const testData = {
  organizations: [...Array(3).keys()].map((index) => ({
    ...NewOrganization.getDefaultOrganization(),
    name: `AT_${testCaseId}_Organization_${index + 1}_${getRandomPostfix()}`,
    code: `AT-${testCaseId}-${index + 1}-${getRandomPostfix()}`,
    status: 'Active',
  })),
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    before('Create test data and login', () => {
      cy.getAdminToken();
      testData.organizations.forEach((organization) => {
        Organizations.createOrganizationViaApi(organization).then((organizationId) => {
          organization.id = organizationId;
        });
      });
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      testData.organizations.forEach(({ id }) => {
        if (id) Organizations.deleteOrganizationViaApi(id, { failOnStatusCode: false });
      });
      if (user?.userId) Users.deleteViaApi(user.userId);
    });

    it(
      'C740213 Verify that it is possible to select organization codes and names using "Organization look-up" plugin (corsair)',
      { tags: ['criticalPath', 'corsair', testCaseId] },
      () => {
        const selectedOrganizationNames = testData.organizations.map(({ name }) => name);
        const selectedOrganizationName = selectedOrganizationNames[0];
        const expectedCodeQuery = `(organization.code in [${selectedOrganizationNames.join(', ')}])`;
        const expectedFullQuery = `${expectedCodeQuery} AND (organization.name == ${selectedOrganizationName})`;

        // Step 1: Create new list with Organizations record type and open Build query form
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.selectRecordType(Lists.recordTypes.organizations);
        Lists.buildQuery();
        QueryModal.verify();
        QueryModal.verifyQueryTextboxReadOnly();
        QueryModal.verifyQueryTextboxResizable();

        // Step 2: Select Organization Code field, IN operator, and select 3 active organizations
        QueryModal.selectField(organizationFieldValues.code);
        QueryModal.selectOperator(QUERY_OPERATIONS.IN);
        QueryModal.clickOrganizationLookup();
        SelectOrganizationModal.verifyModalView();
        SelectOrganizationModal.filterByOrganizationStatus('Active');
        SelectOrganizationModal.selectOrganizations(selectedOrganizationNames);
        SelectOrganizationModal.save();
        SelectOrganizationModal.verifyClosed();
        QueryModal.verifySelectedMultiselectValue(selectedOrganizationNames);
        QueryModal.verifyQueryAreaContent(expectedCodeQuery);

        // Step 3: Add Organization Name condition and select one active organization
        QueryModal.addNewRow();
        QueryModal.selectField(organizationFieldValues.name, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
        QueryModal.clickOrganizationLookup(1);
        SelectOrganizationModal.verifyModalView();
        SelectOrganizationModal.filterByOrganizationStatus('Active');
        SelectOrganizationModal.findOrganization(selectedOrganizationName);
        QueryModal.verifyQueryAreaContent(expectedFullQuery);

        // Step 4: Test query and verify the selected organization is returned
        QueryModal.clickTestQuery();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.verifyRecordWithContent(selectedOrganizationName);
        QueryModal.verifyRecordWithContent(testData.organizations[0].code);
      },
    );
  });
});
