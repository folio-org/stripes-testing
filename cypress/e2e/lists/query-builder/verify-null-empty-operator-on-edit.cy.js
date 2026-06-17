import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  QUERY_OPERATIONS,
  organizationFieldValues,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import SelectOrganizationModal from '../../../support/fragments/orders/modals/selectOrganizationModal';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const listName = `AT_C451521_List_${getRandomPostfix()}`;
const listDescription = `AT_C451521_Description_${getRandomPostfix()}`;
const organization = {
  ...NewOrganization.defaultUiOrganizations,
  name: `AT_C451521_Org_${getRandomPostfix()}`,
  code: `AT_C451521_Code_${getRandomPostfix()}`,
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

        Organizations.createOrganizationViaApi(organization).then((orgId) => {
          organization.id = orgId;
        });

        cy.login(user.username, user.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Lists.deleteListByNameViaApi(listName);
      Organizations.deleteOrganizationViaApi(organization.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      "C451521 Verify that the operator 'null/empty' works correctly when editing the list (corsair)",
      { tags: ['criticalPath', 'corsair', 'C451521'] },
      () => {
        // Step 1: Create new list with Organizations record type and open Build query form
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.setDescription(listDescription);
        Lists.selectRecordType(Lists.recordTypes.organizations);
        Lists.buildQuery();
        QueryModal.verifyQueryTextboxReadOnly();
        QueryModal.verifyQueryTextboxResizable();

        // Step 2: Configure first query condition: Organization Code, is null/empty, False
        QueryModal.selectField(organizationFieldValues.code);
        QueryModal.verifySelectedField(organizationFieldValues.code);
        QueryModal.verifyQueryAreaContent('(code  )');
        QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
        QueryModal.verifySelectedOperator(` ${QUERY_OPERATIONS.IS_NULL}`);
        QueryModal.verifyQueryAreaContent('(code  is null/empty )');
        QueryModal.verifyOptionsInValueSelect(['True', 'False']);
        QueryModal.chooseValueSelect('False');
        QueryModal.verifySelectedValue('False');
        QueryModal.verifyQueryAreaContent('(code  is null/empty false)');
        QueryModal.addNewRow();
        QueryModal.selectField(organizationFieldValues.name, 1);
        QueryModal.verifySelectedField(organizationFieldValues.name, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
        QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL, 1);
        QueryModal.clickOrganizationLookup(1);
        SelectOrganizationModal.findOrganization(organization.name);
        QueryModal.testQueryDisabled(false);
        QueryModal.testQuery();
        QueryModal.clickRunQueryAndSave();
        Lists.verifySuccessCalloutMessage(`List ${listName} saved.`);
        QueryModal.verifyClosed();

        // Step 3: View updated list and wait for compilation
        Lists.verifyRefreshCompleteCallout(1);
        Lists.viewUpdatedList();
        Lists.waitForCompilingToComplete();
        QueryModal.verifyColumnValueForRow(
          organization.name,
          organizationFieldValues.code,
          organization.code,
        );

        // Step 4: Edit list and edit query
        Lists.openActions();
        Lists.editList();
        Lists.editQuery();
        QueryModal.verifyQueryAreaContent(
          `(code  is null/empty false) AND (name == ${organization.id})`,
        );
        QueryModal.verifySelectedField(organizationFieldValues.code);
        QueryModal.verifySelectedOperator(` ${QUERY_OPERATIONS.IS_NULL}`);
        QueryModal.verifySelectedValue('False');
        QueryModal.verifySelectedField(organizationFieldValues.name, 1);
        QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL, 1);

        // Step 5: Click Test query and verify progress state
        QueryModal.testQueryDisabled(false);
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryAndSaveDisabled(true);
        QueryModal.testQuery();
        QueryModal.testQueryDisabled(true);
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryAndSaveDisabled(true);
        QueryModal.testQueryDisabled(false);
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryAndSaveDisabled(false);
      },
    );
  });
});
