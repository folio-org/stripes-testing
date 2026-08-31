import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  holdingsFieldValues,
  instanceFieldValues,
  itemFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const memberTenantPermissions = [
  Permissions.listsAll.gui,
  Permissions.uiOrganizationsViewEditCreate.gui,
  Permissions.uiOrganizationsViewEditDelete.gui,
  Permissions.uiOrdersView.gui,
  Permissions.uiOrdersCreate.gui,
  Permissions.uiOrdersEdit.gui,
  Permissions.uiOrdersDelete.gui,
  Permissions.inventoryAll.gui,
];

const testData = {
  user: {},
  listName: `AT_C736769_List_${getRandomPostfix()}`,
};

describe('Lists', () => {
  describe('Consortia', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([])
        .then((userProperties) => {
          testData.user = userProperties;
          cy.affiliateUserToTenant({
            tenantId: Affiliations.College,
            userId: testData.user.userId,
            permissions: memberTenantPermissions,
          });
          cy.affiliateUserToTenant({
            tenantId: Affiliations.University,
            userId: testData.user.userId,
            permissions: memberTenantPermissions,
          });
        })
        .then(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.listsPath,
            waiter: Lists.verifyNoPermissionWarning,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      if (testData.user.userId) {
        Users.deleteViaApi(testData.user.userId);
      }
    });

    it(
      'C736769 Verify that the "Affiliation name" is displayed for Instances, Holdings, Items on Member tenant (consortia) (athena)',
      { tags: ['criticalPathECS', 'athena', 'C736769'] },
      () => {
        // Step 1: Switch to College member tenant, create new list, select Instances, open query builder
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        Lists.waitLoading();
        Lists.openNewListPane();
        Lists.setName(testData.listName);
        Lists.selectRecordType(Lists.recordTypes.instances);
        Lists.buildQuery();
        QueryModal.verify();

        // Step 2: Verify "Instance — Affiliation name" field is available
        QueryModal.verifyAllAvailableFieldOptions([instanceFieldValues.affiliationName]);

        // Step 3: Select field, IN operator, verify value dropdown includes current and central tenants
        QueryModal.selectField(instanceFieldValues.affiliationName);
        QueryModal.selectOperator(QUERY_OPERATIONS.IN);
        QueryModal.verifExactListOfOptionsInMultiselectMenu([
          `${tenantNames.central}+`,
          `${tenantNames.college}+`,
        ]);

        // Step 4: Close query builder, select Holdings, open query builder
        QueryModal.clickXButtton();
        Lists.selectRecordType(Lists.recordTypes.holdings);
        Lists.buildQuery();
        QueryModal.verify();

        // Step 5: Verify "Holdings — Affiliation name" field is available
        QueryModal.verifyAllAvailableFieldOptions([holdingsFieldValues.affiliationName]);

        // Step 6: Select field, IN operator, verify only the current tenant is in value dropdown
        QueryModal.selectField(holdingsFieldValues.affiliationName);
        QueryModal.selectOperator(QUERY_OPERATIONS.IN);
        QueryModal.verifExactListOfOptionsInMultiselectMenu([`${tenantNames.college}+`]);

        // Step 7: Close query builder, select Items, open query builder
        QueryModal.clickXButtton();
        Lists.selectRecordType(Lists.recordTypes.items);
        Lists.buildQuery();
        QueryModal.verify();

        // Step 8: Verify "Item — Affiliation name" field is available
        QueryModal.verifyAllAvailableFieldOptions([itemFieldValues.affiliationName]);

        // Step 9: Select field, IN operator, verify only the current tenant is in value dropdown
        QueryModal.selectField(itemFieldValues.affiliationName);
        QueryModal.selectOperator(QUERY_OPERATIONS.IN);
        QueryModal.verifExactListOfOptionsInMultiselectMenu([`${tenantNames.college}+`]);
      },
    );
  });
});
