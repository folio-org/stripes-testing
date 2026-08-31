import Affiliations from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  instanceFieldValues,
  QUERY_OPERATIONS,
  STRING_STORES_UUID_OPERATORS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

const todayDate = DateTools.getCurrentDate();
const testData = {
  user: {},
  listName: `AT_C411845_List_${getRandomPostfix()}`,
  instanceTitle: `AT_C411845_SharedInstance_${getRandomPostfix()}`,
  instanceId: null,
  instanceTypeId: null,
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

        cy.then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instanceTitle,
            },
          }).then(({ instanceId }) => {
            testData.instanceId = instanceId;
          });
        });

        cy.createTempUser([Permissions.listsEdit.gui, Permissions.inventoryAll.gui]).then(
          (userProperties) => {
            testData.user = userProperties;
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.listsPath,
              waiter: Lists.waitLoading,
            });
          },
        );
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        if (testData.instanceId) {
          InventoryInstance.deleteInstanceViaApi(testData.instanceId);
        }
        if (testData.user.userId) {
          Users.deleteViaApi(testData.user.userId);
        }
      });

      it(
        'C411845 Verify the "Instance - Shared" is always "Shared" when the "Instance — Tenant ID" is "consortium" (consortia) (athena)',
        { tags: ['criticalPathECS', 'athena', 'C411845'] },
        () => {
          // Step 1: Create new list with Instances record type and open Query builder
          Lists.openNewListPane();
          Lists.setName(testData.listName);
          Lists.selectRecordType(Lists.recordTypes.instances);
          Lists.buildQuery();
          QueryModal.verify();

          // Step 2-3: Select "Instance — Tenant ID" field
          QueryModal.selectField(instanceFieldValues.instanceTenantId);
          QueryModal.verifySelectedField(instanceFieldValues.instanceTenantId);
          QueryModal.verifyQueryAreaContent('');

          // Step 4: Verify supported operators for "Instance — Tenant ID"
          QueryModal.verifyOperatorsList(STRING_STORES_UUID_OPERATORS);

          // Step 5: Select "equals" operator, choose "consortium" value, run test query
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect(Affiliations.Consortia);
          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.createdDate, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.pickDate(todayDate, 1);
          cy.intercept('GET', '/query/**').as('waiterForQueryCompleted');
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryCompleted('@waiterForQueryCompleted');

          // Step 6: Verify preview of matched records
          QueryModal.verifyPreviewOfRecordsMatched();

          // Step 7: Verify "Instance — Shared" column shows "Shared" for all rows
          QueryModal.verifyColumnDisplayed(instanceFieldValues.instanceShared);
          Lists.verifyQueryValue('Shared', QUERY_OPERATIONS.EQUAL, 'list-column-instance.shared');
        },
      );
    });
  });
});
