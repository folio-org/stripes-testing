import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  instanceFieldValues,
  QUERY_OPERATIONS,
  STRING_STORES_UUID_OPERATORS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import { Lists } from '../../../../support/fragments/lists/lists';
import ListsFile, { instanceCsvHeaders } from '../../../../support/fragments/lists/lists-file';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

const testData = {
  user: {},
  listName: `AT_C503086_InstanceTenantID_${getRandomPostfix()}`,
  sharedInstances: [],
};
const todayDate = DateTools.getCurrentDate();

describe('Lists', () => {
  describe('Consortia', () => {
    describe('Instances', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();

        // make sure there are no duplicate records in the system
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C503086');

        cy.createTempUser([
          Permissions.listsEdit.gui,
          Permissions.inventoryAll.gui,
          Permissions.listsExport.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          // Assign affiliations to user
          [Affiliations.College, Affiliations.University].forEach((affiliation) => {
            cy.affiliateUserToTenant({
              tenantId: affiliation,
              userId: testData.user.userId,
              permissions: [
                Permissions.listsEdit.gui,
                Permissions.inventoryAll.gui,
                Permissions.listsExport.gui,
              ],
            });
          });
        });

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });

        // Create multiple shared instances in central tenant
        cy.then(() => {
          const instanceCount = 3;
          for (let i = 0; i < instanceCount; i++) {
            const instanceTitle = `AT_C503086_SharedInstance${i + 1}_${getRandomPostfix()}`;
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                title: instanceTitle,
                instanceTypeId: testData.instanceTypeId,
              },
            }).then((instanceData) => {
              testData.sharedInstances.push({
                id: instanceData.instanceId,
                title: instanceTitle,
              });
            });
          }
        }).then(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Lists.deleteListByNameViaApi(testData.listName);
        Lists.deleteDownloadedFile(testData.listName);

        testData.sharedInstances.forEach((instance) => {
          if (instance.id) {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          }
        });

        if (testData.user.userId) {
          Users.deleteViaApi(testData.user.userId);
        }
      });

      it(
        'C503086 Verify while in the Central tenant, the "Instance — Tenant ID" values include consortium + all tenant affiliations (consortia) (athena)',
        { tags: ['smokeECS', 'athena', 'C503086'] },
        () => {
          // Step 1: Create new list with Instances record type and open Query builder
          Lists.openNewListPane();
          Lists.setName(testData.listName);
          Lists.selectRecordType(Lists.recordTypes.instances);
          Lists.buildQuery();
          QueryModal.verify();

          // Step 2-3: Search for "Instance — Tenant ID" field and select it
          QueryModal.selectField(instanceFieldValues.instanceTenantId);
          QueryModal.verifySelectedField(instanceFieldValues.instanceTenantId);
          QueryModal.verifyQueryAreaContent('(instance.tenant_id  )');

          // Step 4: Verify supported operators for "Instance — Tenant ID" field
          QueryModal.verifyOperatorsList(STRING_STORES_UUID_OPERATORS);

          // Step 5: Select "equals" operator and verify dropdown values include consortium + tenant affiliations
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);

          const sortedValues = [
            Affiliations.College,
            Affiliations.Consortia,
            Affiliations.University,
          ].sort();

          QueryModal.verifyOptionsInValueSelect(sortedValues);

          // Step 6: Select "is null/empty" operator with "False" value and test query
          QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
          QueryModal.verifySelectedOperator(` ${QUERY_OPERATIONS.IS_NULL}`);
          QueryModal.selectValueFromSelect('False');
          QueryModal.verifySelectedValue('False');
          QueryModal.verifyQueryAreaContent('(instance.tenant_id  is null/empty false)');

          // Add additional filter: Instance title starts with test prefix to narrow down results
          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.instanceResourceTitle, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH, 1);
          QueryModal.fillInValueTextfield('AT_C503086_SharedInstance', 1);
          QueryModal.verifyQueryAreaContent(
            '(instance.tenant_id  is null/empty false) AND (instance.title starts with AT_C503086_SharedInstance)',
          );

          // Add additional filter: Instance created date equals today to further narrow results
          QueryModal.addNewRow(1);
          QueryModal.selectField(instanceFieldValues.createdDate, 2);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 2);
          QueryModal.fillInValueTextfield(todayDate, 2);
          QueryModal.verifyQueryAreaContent(
            `(instance.tenant_id  is null/empty false) AND (instance.title starts with AT_C503086_SharedInstance) AND (instance.created_at == ${todayDate})`,
          );

          QueryModal.testQueryDisabled(false);
          cy.intercept('GET', '**/query/**').as('query');
          QueryModal.testQuery();

          // Verify test query in progress (button inactive, progress bar, etc.)
          QueryModal.testQueryDisabled(true);
          QueryModal.cancelDisabled(false);
          QueryModal.runQueryAndSaveDisabled(true);

          // Step 7: Wait for query to complete and verify preview of found records
          QueryModal.waitForQueryCompleted('@query');
          Lists.verifyPreviewOfRecordsMatched();
          QueryModal.testQueryDisabled(false);
          QueryModal.cancelDisabled(false);
          QueryModal.runQueryAndSaveDisabled(false);

          // Step 8: Verify "Instance — Tenant ID" column values in preview table
          // Verify specific instances created in preconditions appear with correct tenant ID (consortium)
          testData.sharedInstances.forEach((instance) => {
            QueryModal.verifyMatchedRecordsByIdentifier(
              instance.title,
              instanceFieldValues.instanceTenantId,
              Affiliations.Consortia,
            );
          });

          // Step 9: Run query and save list
          Lists.runQueryAndSave();
          Lists.verifyListSavedCalloutMessage(testData.listName);
          Lists.waitForCompilingToComplete();
          Lists.verifyMultipleTenantsMessageBanner();

          // Step 10: Export list to CSV
          Lists.openActions();
          Lists.exportList();
          Lists.verifyListExportGeneratedCalloutMessage(testData.listName);
          Lists.verifyListExportedCalloutMessage(testData.listName);

          // Step 11: Verify CSV content - "Instance - Tenant ID" column populated correctly
          testData.sharedInstances.forEach((instance) => {
            ListsFile.verifyHeaderAndValuesInCsvFileByIdentifier(
              testData.listName,
              instanceCsvHeaders.instanceId,
              instance.id,
              [
                {
                  header: instanceCsvHeaders.instanceTenantId,
                  value: Affiliations.Consortia,
                },
              ],
            );
          });
        },
      );
    });
  });
});
