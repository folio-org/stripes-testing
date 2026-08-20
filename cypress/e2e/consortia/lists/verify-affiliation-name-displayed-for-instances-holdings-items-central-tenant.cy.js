import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  holdingsFieldValues,
  itemFieldValues,
  instanceFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import { ITEM_STATUS_NAMES } from '../../../support/constants/inventory/item';
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
  listName: `AT_C736768_List_${getRandomPostfix()}`,
  instanceTitle: `AT_C736768_Instance_${getRandomPostfix()}`,
  itemBarcode: `AT_C736768_Item_${getRandomPostfix()}`,
  instanceTypeId: null,
  holdingTypeId: null,
  locationId: null,
  loanTypeId: null,
  materialTypeId: null,
  sourceId: null,
  instanceId: null,
  holdingsId: null,
  itemId: null,
};

describe('Lists', () => {
  describe('Consortia', () => {
    before('Create test data', () => {
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

      // Create holdings and item in College — central tenant does not support local holdings/items
      cy.setTenant(Affiliations.College);

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
        InventoryHoldings.createHoldingRecordViaApi({
          instanceId: testData.instanceId,
          permanentLocationId: testData.locationId,
          sourceId: testData.sourceId,
        }).then((holding) => {
          testData.holdingsId = holding.id;
          InventoryItems.createItemViaApi({
            barcode: testData.itemBarcode,
            status: { name: ITEM_STATUS_NAMES.AVAILABLE },
            holdingsRecordId: testData.holdingsId,
            materialType: { id: testData.materialTypeId },
            permanentLoanType: { id: testData.loanTypeId },
          }).then((item) => {
            testData.itemId = item.id;
          });
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
      cy.setTenant(Affiliations.College);

      if (testData.itemId) {
        InventoryItems.deleteItemViaApi(testData.itemId);
      }
      if (testData.holdingsId) {
        InventoryHoldings.deleteHoldingRecordViaApi(testData.holdingsId);
      }

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
      'C736768 Verify that the "Affiliation name" is displayed for Instances, Holdings, Items on Central tenant (consortia) (athena)',
      { tags: ['criticalPathECS', 'athena', 'C736768'] },
      () => {
        // Steps 1-4: Instances
        Lists.openNewListPane();
        Lists.setName(testData.listName);
        Lists.selectRecordType(Lists.recordTypes.instances);
        Lists.buildQuery();
        QueryModal.verify();

        // Step 2: Verify "Instance — Affiliation name" is available in field dropdown
        QueryModal.verifyAllAvailableFieldOptions([instanceFieldValues.affiliationName]);

        // Step 3: Select the field, IN operator, verify value options include tenant names
        QueryModal.selectField(instanceFieldValues.affiliationName);
        QueryModal.selectOperator(QUERY_OPERATIONS.IN);
        QueryModal.verifExactListOfOptionsInMultiselectMenu([
          `${tenantNames.central}+`,
          `${tenantNames.college}+`,
        ]);

        // Step 4: Select a value and run test query
        QueryModal.chooseFromValueMultiselect(tenantNames.central);
        QueryModal.clickTestQuery();
        QueryModal.waitForQueryTestToFinish();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.verifyColumnDisplayed(instanceFieldValues.affiliationName);
        Lists.verifyQueryValue(
          instanceFieldValues.affiliationName,
          QUERY_OPERATIONS.IN,
          'list-column-instance.tenant_name',
          tenantNames.central,
        );

        // Steps 5-8: Holdings
        QueryModal.clickXButtton();
        Lists.selectRecordType(Lists.recordTypes.holdings);
        Lists.buildQuery();
        QueryModal.verify();

        // Step 6: Verify "Holdings — Affiliation name" is available in field dropdown
        QueryModal.verifyAllAvailableFieldOptions([holdingsFieldValues.affiliationName]);

        // Step 7: Select the field, IN operator, verify value options include tenant names
        QueryModal.selectField(holdingsFieldValues.affiliationName);
        QueryModal.selectOperator(QUERY_OPERATIONS.IN);
        QueryModal.verifExactListOfOptionsInMultiselectMenu([
          `${tenantNames.central}+`,
          `${tenantNames.college}+`,
        ]);

        // Step 8: Select a value and run test query
        QueryModal.chooseFromValueMultiselect(tenantNames.college);
        QueryModal.clickTestQuery();
        QueryModal.waitForQueryTestToFinish();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.verifyColumnDisplayed(holdingsFieldValues.affiliationName);
        Lists.verifyQueryValue(
          holdingsFieldValues.affiliationName,
          QUERY_OPERATIONS.IN,
          'list-column-holdings.tenant_name',
          tenantNames.college,
        );

        // Steps 9-12: Items
        QueryModal.clickXButtton();
        Lists.selectRecordType(Lists.recordTypes.items);
        Lists.buildQuery();
        QueryModal.verify();

        // Step 10: Verify all three affiliation fields appear in field dropdown for Items
        QueryModal.verifyAllAvailableFieldOptions([
          itemFieldValues.affiliationName,
          instanceFieldValues.affiliationName,
          holdingsFieldValues.affiliationName,
        ]);

        // Step 11: Select Items affiliation field, IN operator, verify tenant options
        QueryModal.selectField(itemFieldValues.affiliationName);
        QueryModal.selectOperator(QUERY_OPERATIONS.IN);
        QueryModal.verifExactListOfOptionsInMultiselectMenu([
          `${tenantNames.central}+`,
          `${tenantNames.college}+`,
        ]);

        // Step 12: Select a value and run test query
        QueryModal.chooseFromValueMultiselect(tenantNames.college);
        QueryModal.clickTestQuery();
        QueryModal.waitForQueryTestToFinish();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.verifyColumnDisplayed(itemFieldValues.affiliationName);
        Lists.verifyQueryValue(
          itemFieldValues.affiliationName,
          QUERY_OPERATIONS.IN,
          'list-column-items.tenant_name',
          tenantNames.college,
        );
      },
    );
  });
});
