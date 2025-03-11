import uuid from 'uuid';
import { APPLICATION_NAMES, ITEM_STATUS_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
// import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
// import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
// import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
// import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
// import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
// import Users from '../../../../support/fragments/users/users';
// import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import ItemRecordView, {
  actionsMenuOptions,
} from '../../../../support/fragments/inventory/item/itemRecordView';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';

describe('Inventory', () => {
  describe('Item', () => {
    const testData = {
      user: {},
      collegeTenant: {
        locationName: 'autotest_location_name_553.1972285487486114',
        instance: {},
        holdings: {},
        // item:{ barcode: uuid() }
        item: { barcode: 'b1ca25de-314a-4b64-b613-5a073f542085' },
      },
      universityTenant: {
        holdings: {},
        item: { barcode: uuid() },
      },
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
      // cy.withinTenant(Affiliations.College, () => {
      //   InventoryInstance.createInstanceViaApi()
      //     .then(({ instanceData }) => {
      //       testData.collegeTenant.instance = instanceData;

      //       ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' }).then(
      //         (servicePoints) => {
      //           testData.collegeTenant.holdings.location = Locations.getDefaultLocation({
      //             servicePointId: servicePoints[0].id,
      //           }).location;
      //           Locations.createViaApi(testData.collegeTenant.holdings.location).then((location) => {
      //             testData.collegeTenant.holdings.location.id = location.id;
      //             testData.collegeTenant.locationName = location.name;
      //           });
      //         },
      //       );
      //       InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
      //         testData.collegeTenant.holdings.sourceId = folioSource.id;
      //       });
      //       cy.getLoanTypes({ limit: 1 }).then((res) => {
      //         testData.collegeTenant.item.loanTypeId = res[0].id;
      //       });
      //       cy.getMaterialTypes({ limit: 1 }).then((res) => {
      //         testData.collegeTenant.item.materialTypeId = res.id;
      //       });
      //     })
      //     .then(() => {
      //       InventoryHoldings.createHoldingRecordViaApi({
      //         instanceId: testData.collegeTenant.instance.instanceId,
      //         permanentLocationId: testData.collegeTenant.holdings.location.id,
      //         sourceId: testData.collegeTenant.holdings.sourceId,
      //       }).then((holding) => {
      //         testData.collegeTenant.holdings = holding;

      //         InventoryItems.createItemViaApi({
      //           barcode: testData.collegeTenant.item.barcode,
      //           holdingsRecordId: testData.collegeTenant.holdings.id,
      //           materialType: { id: testData.collegeTenant.item.materialTypeId },
      //           permanentLoanType: { id: testData.collegeTenant.item.loanTypeId },
      //           status: { name: ITEM_STATUS_NAMES.AVAILABLE },
      //         }).then((item) => {
      //           testData.collegeTenant.item = item;
      //         });

      //         InventoryInstance.shareInstanceViaApi(
      //           testData.collegeTenant.instance.instanceId,
      //           testData.consortiaId,
      //           Affiliations.College,
      //           Affiliations.Consortia,
      //         );
      //       });
      //     });
      // });

      cy.withinTenant(Affiliations.University, () => {
        ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' })
          .then((servicePoints) => {
            testData.universityTenant.holdings.location = Locations.getDefaultLocation({
              servicePointId: servicePoints[0].id,
            }).location;
            Locations.createViaApi(testData.universityTenant.holdings.location).then((location) => {
              testData.universityTenant.holdings.location.id = location.id;
              testData.universityTenant.locationName = location.name;
            });
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              testData.universityTenant.holdings.sourceId = folioSource.id;
            });
            cy.getLoanTypes({ limit: 1 }).then((res) => {
              testData.universityTenant.item.loanTypeId = res[0].id;
            });
            cy.getMaterialTypes({ limit: 1 }).then((res) => {
              testData.universityTenant.item.materialTypeId = res.id;
            });
          })
          .then(() => {
            InventoryHoldings.createHoldingRecordViaApi({
              // instanceId: testData.collegeTenant.instance.instanceId,
              instanceId: 'a1520d03-0535-4ed4-87ca-65d20328d982',
              permanentLocationId: testData.universityTenant.holdings.location.id,
              sourceId: testData.universityTenant.holdings.sourceId,
            }).then((holding) => {
              testData.universityTenant.holdings = holding;

              InventoryItems.createItemViaApi({
                barcode: testData.universityTenant.item.barcode,
                holdingsRecordId: testData.universityTenant.holdings.id,
                materialType: { id: testData.universityTenant.item.materialTypeId },
                permanentLoanType: { id: testData.universityTenant.item.loanTypeId },
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              }).then((item) => {
                testData.universityTenant.item = item;
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

        cy.login(testData.user.username, testData.user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.waitContentLoading();
        cy.pause();
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        // InventoryInstances.searchByTitle(testData.collegeTenant.instance.instanceId);
        InventoryInstances.searchByTitle('a1520d03-0535-4ed4-87ca-65d20328d982');
        // cy.pause();
        InventoryInstances.selectInstance();
        InstanceRecordView.waitLoading();
      });
    });

    // after('Delete test data', () => {
    //   cy.resetTenant();
    //   cy.getAdminToken();
    //   Users.deleteViaApi(testData.user.userId);
    //   cy.withinTenant(Affiliations.University, () => {
    //     cy.deleteHoldingRecordViaApi(testData.holdings.id);
    //     InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
    //     Locations.deleteViaApi(testData.location);
    //   });
    // });

    it(
      'C553015 Check "Update ownership" option in Item option menu (consortia) (folijet)',
      { tags: ['criticalPathECS', 'folijet', 'C553015'] },
      () => {
        InstanceRecordView.openHoldingItem({
          name: testData.collegeTenant.locationName,
          barcode: testData.collegeTenant.item.barcode,
        });
        ItemRecordView.validateOptionInActionsMenu([
          { optionName: actionsMenuOptions.updateOwnership, shouldExist: true },
        ]);
        ItemRecordView.updateOwnership(tenantNames.university);
        // InstanceRecordView.openHoldingView();
        // HoldingsRecordView.checkHoldingRecordViewOpened();
        // HoldingsRecordView.validateOptionInActionsMenu([
        //   { optionName: actionsMenuOptions.updateOwnership, shouldExist: true },
        // ]);
        // ['cancel', 'confirm'].forEach((action) => {
        //   HoldingsRecordView.updateOwnership(
        //     tenantNames.university,
        //     action,
        //     testData.holdings.hrid,
        //     tenantNames.college,
        //     testData.location.name,
        //   );
        // });
        // InstanceRecordView.waitLoading();
        // InstanceRecordView.verifyConsortiaHoldingsAccordion(false);
        // InstanceRecordView.expandConsortiaHoldings();
        // InstanceRecordView.verifyMemberSubHoldingsAccordionAbsent(Affiliations.College);
        // InstanceRecordView.verifyMemberSubHoldingsAccordion(Affiliations.University);
        // InstanceRecordView.expandMemberSubHoldings(tenantNames.university);
        // InstanceRecordView.verifyIsHoldingsCreated([`${testData.location.name} >`]);
      },
    );
  });
});
