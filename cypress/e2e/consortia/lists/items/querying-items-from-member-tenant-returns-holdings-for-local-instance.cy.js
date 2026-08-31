import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  instanceFieldValues,
  itemFieldValues,
  holdingsFieldValues,
  QUERY_OPERATIONS,
  dateTimeOperators,
} from '../../../../support/fragments/bulk-edit/query-modal';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import { Lists } from '../../../../support/fragments/lists/lists';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { ITEM_STATUS_NAMES } from '../../../../support/constants/inventory/item';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { INSTANCE_SOURCE_NAMES } from '../../../../support/constants';

const testData = {
  user: {},
  listName: `AT_C552522_List_${getRandomPostfix()}`,
  itemIds: [],
  holdingIds: [],
  instanceIds: [],
};
const todayDate = DateTools.getCurrentDate();
const userPermissions = [
  Permissions.listsEdit.gui,
  Permissions.inventoryAll.gui,
  Permissions.consortiaInventoryShareLocalInstance.gui,
];

describe('Lists', () => {
  describe('Consortia', () => {
    describe('Items', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });

        [Affiliations.College, Affiliations.University].forEach((tenant) => {
          // Create local instances, holdings, and items
          cy.withinTenant(tenant, () => {
            cy.getLocations({ limit: 1 }).then((location) => {
              testData.locationId = location.id;
            });
            cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
              testData.loanTypeId = loanTypes[0].id;
            });
            cy.getDefaultMaterialType().then((materialType) => {
              testData.materialTypeId = materialType.id;
            });
            InventoryHoldings.getHoldingsFolioSource().then((source) => {
              testData.sourceId = source.id;
            });

            cy.then(() => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: testData.instanceTypeId,
                  title: `AT_C552522_LocalInstance_${getRandomPostfix()}`,
                },
              }).then(({ instanceId }) => {
                testData.instanceIds.push(instanceId);
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId,
                  permanentLocationId: testData.locationId,
                  sourceId: testData.sourceId,
                }).then((holding) => {
                  testData.holdingIds.push(holding.id);
                  InventoryItems.createItemViaApi({
                    barcode: `AT_C552522_Item_${getRandomPostfix()}`,
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    holdingsRecordId: holding.id,
                    materialType: { id: testData.materialTypeId },
                    permanentLoanType: { id: testData.loanTypeId },
                  }).then((item) => {
                    testData.itemIds.push(item.id);
                  });
                });
              });
            });
          });
        });

        cy.createTempUser(userPermissions).then((userProperties) => {
          testData.user = userProperties;

          [Affiliations.College, Affiliations.University].forEach((affiliation) => {
            cy.affiliateUserToTenant({
              tenantId: affiliation,
              userId: testData.user.userId,
              permissions: userPermissions,
            });
          });

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

        [Affiliations.College, Affiliations.University].forEach((tenant, index) => {
          cy.withinTenant(tenant, () => {
            InventoryItems.deleteItemViaApi(testData.itemIds[index]);
            InventoryHoldings.deleteHoldingRecordViaApi(testData.holdingIds[index]);
            InventoryInstance.deleteInstanceViaApi(testData.instanceIds[index]);
          });
        });

        if (testData.user.userId) {
          Users.deleteViaApi(testData.user.userId);
        }
      });

      it(
        'C552522 Querying items from the member tenant, returns the holding record associated with local instance (consortia) (athena)',
        { tags: ['criticalPathECS', 'athena', 'C552522'] },
        () => {
          // Step 1: Switch to College (Tenant_A)
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);

          // Step 2: Click "New", add list name, select Items record type, open query builder
          Lists.openNewListPane();
          Lists.setName(`${testData.listName}_${getRandomPostfix()}`);
          Lists.selectRecordType(Lists.recordTypes.items);
          Lists.buildQuery();
          QueryModal.verify();

          // Step 3: Select "Item — Created date" field
          QueryModal.selectField(itemFieldValues.itemCreatedDate);
          QueryModal.verifySelectedField(itemFieldValues.itemCreatedDate);
          QueryModal.verifyQueryAreaContent('');

          // Step 4: Verify supported operators for "Item — Created date" field
          QueryModal.verifyOperatorsList(dateTimeOperators);

          // Step 5: Select "equals" operator, choose today's date, run test query
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.pickDate(todayDate);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();

          // Step 6: Verify preview shows local item with correct shared columns
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.clickShowColumnsButton();
          QueryModal.clickCheckboxInShowColumns(itemFieldValues.itemUuid);
          QueryModal.clickCheckboxInShowColumns(instanceFieldValues.instanceSource);
          QueryModal.clickShowColumnsButton();
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.itemIds[0],
            instanceFieldValues.instanceShared,
            'Local',
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.itemIds[0],
            instanceFieldValues.affiliationName,
            tenantNames.college,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.itemIds[0],
            holdingsFieldValues.affiliationName,
            tenantNames.college,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.itemIds[0],
            itemFieldValues.affiliationName,
            tenantNames.college,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.itemIds[0],
            instanceFieldValues.instanceSource,
            INSTANCE_SOURCE_NAMES.FOLIO,
          );
          Lists.verifyQueryValue(
            tenantNames.college,
            QUERY_OPERATIONS.EQUAL,
            'list-column-items.tenant_name',
          );
          Lists.verifyQueryValue(
            tenantNames.college,
            QUERY_OPERATIONS.EQUAL,
            'list-column-holdings.tenant_name',
          );

          // Step 7: Switch to University (Tenant_B) and repeat steps 1-6
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
          Lists.openNewListPane();
          Lists.setName(`${testData.listName}_${getRandomPostfix()}`);
          Lists.selectRecordType(Lists.recordTypes.items);
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.selectField(itemFieldValues.itemCreatedDate);
          QueryModal.verifySelectedField(itemFieldValues.itemCreatedDate);
          QueryModal.verifyQueryAreaContent('');
          QueryModal.verifyOperatorsList(dateTimeOperators);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.pickDate(todayDate);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          Lists.verifyQueryValue(
            tenantNames.university,
            QUERY_OPERATIONS.EQUAL,
            'list-column-items.tenant_name',
          );
          Lists.verifyQueryValue(
            tenantNames.university,
            QUERY_OPERATIONS.EQUAL,
            'list-column-holdings.tenant_name',
          );
        },
      );
    });
  });
});
