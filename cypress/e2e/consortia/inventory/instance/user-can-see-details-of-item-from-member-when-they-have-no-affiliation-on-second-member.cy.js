import uuid from 'uuid';
import { ITEM_STATUS_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Instance', () => {
    let user;
    const testData = {
      itemBarcode: uuid(),
    };

    before('Create test data', () => {
      cy.createTempUser([Permissions.inventoryAll.gui])
        .then((userProperties) => {
          user = userProperties;
        })
        .then(() => {
          cy.getAdminToken();
          cy.getConsortiaId().then((consortiaId) => {
            testData.consortiaId = consortiaId;
          });
          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, [Permissions.inventoryAll.gui]);
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            testData.holdingTypeId = res[0].id;
          });
          cy.getLocations({ limit: 1 }).then((locations) => {
            testData.locationId = locations.id;
          });
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            testData.loanTypeId = res[0].id;
          });
          cy.getMaterialTypes({ limit: 1 }).then((res) => {
            testData.materialTypeId = res.id;
          });
        })
        .then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instanceTitle,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.locationId,
              },
            ],
            items: [
              {
                barcode: testData.itemBarcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          }).then((specialInstanceIds) => {
            testData.instanceIds = specialInstanceIds;

            InventoryInstance.shareInstanceViaApi(
              testData.instanceIds.instanceId,
              testData.consortiaId,
              Affiliations.College,
              Affiliations.Consortia,
            );
          });
          cy.resetTenant();

          cy.assignAffiliationToUser(Affiliations.University, user.userId);

          cy.resetTenant();
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      cy.setTenant(Affiliations.College);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
        testData.instanceIds.instanceId,
      );
    });

    it(
      'C422239 (CONSORTIA) User can see the details of the item from Member tenant when they have no affiliation on second member tenant (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet', 'C422239'] },
      () => {
        InventoryInstances.searchByTitle(testData.instanceIds.instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.verifyConsortiaHoldingsAccordion();
        InventoryInstance.expandConsortiaHoldings();
        InventoryInstance.verifyMemberSubHoldingsAccordion(Affiliations.College);
        InventoryInstance.expandMemberSubHoldings('College');
        InstanceRecordView.verifyMemberSubSubHoldingsAccordion(
          'College',
          Affiliations.College,
          testData.instanceIds.holdings[0].id,
        );
        InventoryInstance.openHoldingView();
        HoldingsRecordView.waitLoading();

        HoldingsRecordView.close();
        InventoryInstance.expandMemberSubSubHoldings(
          'college',
          testData.instanceIds.holdings[0].id,
        );
        InventoryInstance.openItemByBarcode(testData.itemBarcode);
        ItemRecordView.waitLoading();
      },
    );
  });
});
