import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  instanceFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import getRandomPostfix from '../../../support/utils/stringTools';

const userPermissions = [
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
  listName: `AT_C850001_List_${getRandomPostfix()}`,
  centralInstanceTitle: `AT_C850001_Instance_${getRandomPostfix()}`,
  collegeInstanceTitle: `AT_C850001_InstanceCollege_${getRandomPostfix()}`,
  centralInstanceId: null,
  collegeInstanceId: null,
};
const buildInstanceAffiliationQuery = () => {
  cy.wait(2000);
  Lists.buildQuery();
  QueryModal.verify();
  QueryModal.selectField(instanceFieldValues.affiliationName);
};

describe('Lists', () => {
  describe('Consortia', () => {
    before('Create test data', () => {
      cy.getAdminToken();

      // Create an instance in Central tenant
      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        testData.centralInstanceTypeId = instanceTypes[0].id;
      });
      cy.then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.centralInstanceTypeId,
            title: testData.centralInstanceTitle,
          },
        }).then(({ instanceId }) => {
          testData.centralInstanceId = instanceId;
        });
      });

      // Create an instance in College tenant to have a second affiliation value
      cy.setTenant(Affiliations.College);
      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        testData.collegeInstanceTypeId = instanceTypes[0].id;
      });
      cy.then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.collegeInstanceTypeId,
            title: testData.collegeInstanceTitle,
          },
        }).then(({ instanceId }) => {
          testData.collegeInstanceId = instanceId;
        });
      });

      cy.resetTenant();
      cy.getAdminToken();

      cy.createTempUser(userPermissions)
        .then((userProperties) => {
          testData.user = userProperties;

          cy.affiliateUserToTenant({
            tenantId: Affiliations.College,
            userId: testData.user.userId,
            permissions: userPermissions,
          });
        })
        .then(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });
        });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      if (testData.centralInstanceId) {
        InventoryInstance.deleteInstanceViaApi(testData.centralInstanceId);
      }
      if (testData.user.userId) {
        Users.deleteViaApi(testData.user.userId);
      }
      cy.setTenant(Affiliations.College);
      if (testData.collegeInstanceId) {
        InventoryInstance.deleteInstanceViaApi(testData.collegeInstanceId);
      }
    });

    it(
      'C850001 Verify that the "Affiliation name" is working correctly on the Central tenant with all operators (consortia) (athena)',
      { tags: ['criticalPathECS', 'athena', 'C850001'] },
      () => {
        // Step 1: Open Lists app, create new list, select Instances, open query builder
        Lists.openNewListPane();
        Lists.setName(testData.listName);
        Lists.selectRecordType(Lists.recordTypes.instances);

        // Step 2: operator "equals" + Central tenant
        buildInstanceAffiliationQuery();
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.chooseValueSelect(tenantNames.central);
        QueryModal.clickTestQuery();
        QueryModal.waitForQueryTestToFinish();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.verifyColumnDisplayed(instanceFieldValues.affiliationName);
        Lists.verifyQueryValue(
          tenantNames.central,
          QUERY_OPERATIONS.EQUAL,
          'list-column-instance.tenant_name',
        );

        // Step 3: operator "not equal to" + Central tenant
        QueryModal.clickXButtton();
        buildInstanceAffiliationQuery();
        QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL);
        QueryModal.chooseValueSelect(tenantNames.central);
        QueryModal.clickTestQuery();
        QueryModal.waitForQueryTestToFinish();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.verifyColumnDisplayed(instanceFieldValues.affiliationName);
        Lists.verifyQueryValue(
          tenantNames.central,
          QUERY_OPERATIONS.NOT_EQUAL,
          'list-column-instance.tenant_name',
        );

        // Step 4: operator "IN" + Central tenant and College tenant
        QueryModal.clickXButtton();
        buildInstanceAffiliationQuery();
        QueryModal.selectOperator(QUERY_OPERATIONS.IN);
        QueryModal.chooseFromValueMultiselect(tenantNames.central);
        QueryModal.chooseFromValueMultiselect(tenantNames.college);
        QueryModal.clickTestQuery();
        QueryModal.waitForQueryTestToFinish();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.verifyColumnDisplayed(instanceFieldValues.affiliationName);
        Lists.verifyQueryValue('', QUERY_OPERATIONS.IN, 'list-column-instance.tenant_name', [
          tenantNames.central,
          tenantNames.college,
        ]);

        // Step 5: operator "NOT IN" + Central tenant and College tenant
        QueryModal.clickXButtton();
        buildInstanceAffiliationQuery();
        QueryModal.selectOperator(QUERY_OPERATIONS.NOT_IN);
        QueryModal.chooseFromValueMultiselect(tenantNames.central);
        QueryModal.chooseFromValueMultiselect(tenantNames.college);
        QueryModal.clickTestQuery();
        QueryModal.waitForQueryTestToFinish();
        QueryModal.verifyQueryReturnsNoResults();

        // Step 6: operator "is null/empty" + TRUE
        QueryModal.clickXButtton();
        buildInstanceAffiliationQuery();
        QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
        QueryModal.selectValueFromSelect('True');
        QueryModal.clickTestQuery();
        QueryModal.verifyQueryReturnsNoResults();

        // Step 7: operator "is null/empty" + FALSE
        QueryModal.clickXButtton();
        buildInstanceAffiliationQuery();
        QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
        QueryModal.selectValueFromSelect('False');
        QueryModal.clickTestQuery();
        QueryModal.waitForQueryTestToFinish();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.verifyColumnDisplayed(instanceFieldValues.affiliationName);
        Lists.verifyQueryValue('', QUERY_OPERATIONS.IS_NULL, 'list-column-instance.tenant_name', [
          tenantNames.central,
          tenantNames.college,
        ]);
      },
    );
  });
});
