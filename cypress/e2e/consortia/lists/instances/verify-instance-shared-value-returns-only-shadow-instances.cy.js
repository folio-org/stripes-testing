import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  STRING_STORES_UUID_OPERATORS,
  instanceFieldValues,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import { Lists } from '../../../../support/fragments/lists/lists';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

const todayDate = DateTools.getCurrentDate();
const testData = {
  user: {},
  listName: `AT_C506692_List_${getRandomPostfix()}`,
  sharedInstances: [],
  localInstance: { id: null, title: `AT_C506692_LocalInstance_${getRandomPostfix()}` },
  instanceTypeId: null,
  userPermissions: [Permissions.listsEdit.gui, Permissions.inventoryAll.gui],
};

describe('Lists', () => {
  describe('Consortia', () => {
    describe('Instances', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });

        // Create a local instance in College tenant to ensure local instances exist on clean env
        cy.then(() => {
          cy.setTenant(Affiliations.College);
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              title: testData.localInstance.title,
              instanceTypeId: testData.instanceTypeId,
            },
          }).then(({ instanceId }) => {
            testData.localInstance.id = instanceId;
          });
          cy.resetTenant();
          cy.getAdminToken();
        });

        // Create shared instances in central tenant (appear as shadow instances in member tenant)
        cy.then(() => {
          for (let i = 0; i < 2; i++) {
            const title = `AT_C506692_SharedInstance${i + 1}_${getRandomPostfix()}`;
            InventoryInstances.createFolioInstanceViaApi({
              instance: { title, instanceTypeId: testData.instanceTypeId },
            }).then(({ instanceId }) => {
              testData.sharedInstances.push({ id: instanceId, title });
            });
          }
        });

        cy.createTempUser(testData.userPermissions).then((userProperties) => {
          testData.user = userProperties;

          cy.affiliateUserToTenant({
            tenantId: Affiliations.College,
            userId: testData.user.userId,
            permissions: testData.userPermissions,
          });

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          // Switch to member tenant
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          Lists.waitLoading();
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Lists.deleteListByNameViaApi(testData.listName);
        testData.sharedInstances.forEach(({ id }) => {
          if (id) InventoryInstance.deleteInstanceViaApi(id);
        });
        if (testData.localInstance.id) {
          cy.setTenant(Affiliations.College);
          InventoryInstance.deleteInstanceViaApi(testData.localInstance.id);
          cy.resetTenant();
          cy.getAdminToken();
        }
        if (testData.user.userId) Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C506692 Verify that when Instance sharing is shared then ONLY instances that ARE shadow instances are returned (consortia) (athena)',
        { tags: ['extendedPathECS', 'athena', 'C506692'] },
        () => {
          // Step 1: Create new list with Instances record type and open Query builder
          Lists.openNewListPane();
          Lists.setName(testData.listName);
          Lists.selectRecordType(Lists.recordTypes.instances);
          Lists.buildQuery();
          QueryModal.verify();

          // Step 2: Click "Select field" dropdown
          QueryModal.clickSelectFieldButton();
          QueryModal.verifyFilterOptionsListInputInFocus();
          QueryModal.closeOpenedSelection();

          // Step 3: Search for "Instance — Shared" field and select it
          QueryModal.typeInAndSelectField(instanceFieldValues.instanceShared);
          QueryModal.verifySelectedField(instanceFieldValues.instanceShared);

          // Step 4: Verify supported operators for "Instance — Shared"
          QueryModal.verifyOperatorsList(STRING_STORES_UUID_OPERATORS);

          // Step 5: Select "equals" operator and verify Value options are Local and Shared
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifyOptionsInValueSelect(['Shared', 'Local']);

          // Step 6: Select "Shared" value
          QueryModal.chooseValueSelect('Shared');
          QueryModal.verifySelectedValue('Shared');
          QueryModal.verifyQueryAreaContent('(instance.shared == Shared)');

          // Narrow to today's instances to isolate test data
          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.createdDate, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.fillInValueTextfield(todayDate, 1);
          QueryModal.verifyQueryAreaContent(
            `(instance.shared == Shared) AND (instance.created_at == ${todayDate})`,
          );

          // Step 7: Click "Test query"
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled(true);
          cy.intercept('GET', '**/query/**').as('query');
          QueryModal.testQuery();
          QueryModal.testQueryDisabled(true);
          QueryModal.cancelDisabled(false);
          QueryModal.runQueryDisabled(true);

          // Step 8: Check preview of found records
          QueryModal.waitForQueryCompleted('@query');
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.testQueryDisabled(false);
          QueryModal.cancelDisabled(false);
          QueryModal.runQueryDisabled(false);

          // Step 9: Verify "Instance — Shared" column shows "Shared" for all rows
          QueryModal.verifyColumnDisplayed(instanceFieldValues.instanceShared);
          Lists.verifyQueryValue('Shared', QUERY_OPERATIONS.EQUAL, 'list-column-instance.shared');
        },
      );
    });
  });
});
