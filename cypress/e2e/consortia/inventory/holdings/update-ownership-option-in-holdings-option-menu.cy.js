// import uuid from 'uuid';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
// import Users from '../../../../support/fragments/users/users';
// import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Holdings', () => {
    const testData = {
      instance: {},
      user: {},
      holdings: {},
    };
    const userPermissions = [
      Permissions.inventoryAll.gui,
      Permissions.uiInventoryUpdateOwnership.gui,
    ];

    before('Create test data', () => {
      cy.getAdminToken();
      cy.getConsortiaId().then((consortiaId) => {
        testData.consortiaId = consortiaId;
      });
      cy.withinTenant(Affiliations.College, () => {
        InventoryInstance.createInstanceViaApi()
          .then(({ instanceData }) => {
            testData.instance = instanceData;

            cy.getLocations({ query: 'name="DCB"' }).then((res) => {
              testData.holdings.locationId = res.id;
            });
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              testData.holdings.sourceId = folioSource.id;
            });
          })
          .then(() => {
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.instance.instanceId,
              permanentLocationId: testData.holdings.locationId,
              sourceId: testData.holdings.sourceId,
            }).then((holding) => {
              testData.holdings = holding;

              InventoryInstance.shareInstanceViaApi(
                testData.instance.instanceId,
                testData.consortiaId,
                Affiliations.College,
                Affiliations.Consortia,
              );
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
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
      });
    });

    // after('Delete test data', () => {
    //   cy.resetTenant();
    //   cy.getAdminToken();
    //   Users.deleteViaApi(testData.user.userId);
    //   cy.setTenant(Affiliations.College);
    //   InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
    //   Locations.deleteViaApi(testData.collegeLocation);
    // });

    it(
      'C490891 Check "Update ownership" option in Holdings option menu (consortia) (folijet)',
      { tags: ['criticalPathECS', 'folijet', 'C490891'] },
      () => {
        InventoryInstances.searchByTitle(testData.instance.instanceId);
        InventoryInstances.selectInstance();
        InstanceRecordView.waitLoading();
        InstanceRecordView.openHoldingView();
        HoldingsRecordView.checkHoldingRecordViewOpened();
        HoldingsRecordView.validateOptionInActionsMenu([
          { optionName: 'Update ownership', shouldExist: true },
        ]);
        // HoldingsRecordView.updateOwnership(
        //   // tenant, action, testData.holdings.hrid, firstMember, secondMember

        // );
        // InstanceRecordView.waitLoading();

        //         Holdings disappeared from Member-1 tenant

        // Moved holdings are now placed under "Consortial holdings" accordion in the appropriate Member-2 tenant with the selected in "Update ownership" location
        // InventoryInstance.verifyConsortiaHoldingsAccordion(false);
        //         InventoryInstance.expandConsortiaHoldings();
        //         InventoryInstance.verifyMemberSubHoldingsAccordion(Affiliations.College);
        //         InventoryInstance.expandMemberSubHoldings(Affiliations.College);
        //         InventoryInstance.openHoldingsAccordion(testData.collegeLocation.name);
        //         InventoryInstance.checkIsItemCreated(testData.itemBarcode);
      },
    );
  });
});
