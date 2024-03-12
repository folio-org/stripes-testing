import uuid from 'uuid';
import { ITEM_STATUS_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import Users from '../../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Instance', () => {
    let user;
    const testData = {
      itemBarcode: uuid(),
    };

    before('Create test data', () => {
      cy.getAdminToken();
      cy.getConsortiaId().then((consortiaId) => {
        testData.consortiaId = consortiaId;
      });
      cy.createTempUser([Permissions.inventoryAll.gui])
        .then((userProperties) => {
          user = userProperties;
        })
        .then(() => {
          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, [Permissions.inventoryAll.gui]);
          cy.resetTenant();

          cy.assignAffiliationToUser(Affiliations.University, user.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(user.userId, [Permissions.inventoryAll.gui]);
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            testData.holdingTypeId = res[0].id;
          });
          cy.getLocations({ limit: 1 }).then((locations) => {
            testData.locationName = locations.name;
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
              Affiliations.University,
              Affiliations.Consortia,
            );
          });

          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      cy.setTenant(Affiliations.University);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
        testData.instanceIds.instanceId,
      );
    });

    it(
      'C423392 (CONSORTIA) User can see the the name of locations from Member tenant when he is on the second Member tenant (consortia) (folijet)',
      { tags: ['criticalPathECS', 'folijet'] },
      () => {
        InventoryInstances.searchByTitle(testData.instanceIds.instanceId);
        InventoryInstances.selectInstance();
        InventoryInstance.verifyConsortiaHoldingsAccordion();
        InventoryInstance.expandConsortiaHoldings();
        InventoryInstance.verifyMemberSubHoldingsAccordion(Affiliations.University);
        InventoryInstance.expandMemberSubHoldings(Affiliations.University);
        InventoryInstance.verifyMemberSubSubHoldingsAccordion(
          Affiliations.University,
          testData.instanceIds.holdings[0].id,
        );
        InventoryInstance.openHoldingView();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.checkTitle(`Holdings • ${testData.locationName}`);
        HoldingsRecordView.close();
        InventoryInstance.expandMemberSubSubHoldings(
          Affiliations.University,
          testData.instanceIds.holdings[0].id,
        );
        InventoryInstance.openItemByBarcode(testData.itemBarcode);
        ItemRecordView.verifyEffectiveLocationForItemInDetails(testData.locationName);
        ItemRecordView.verifyHoldingsPermanentLocation(testData.locationName);
        ItemRecordView.verifyItemEffectiveLocation(testData.locationName);
      },
    );
  });
});
