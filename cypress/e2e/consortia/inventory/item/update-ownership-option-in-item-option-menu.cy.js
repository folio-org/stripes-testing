import uuid from 'uuid';
import { APPLICATION_NAMES, ITEM_STATUS_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryNewHoldings from '../../../../support/fragments/inventory/inventoryNewHoldings';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordNew from '../../../../support/fragments/inventory/item/itemRecordNew';
import ItemRecordView, {
  actionsMenuOptions,
} from '../../../../support/fragments/inventory/item/itemRecordView';
import UpdateOwnershipModal from '../../../../support/fragments/inventory/modals/updateOwnershipModal';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Item', () => {
    const testData = {
      user: {},
      collegeTenant: {
        locationId: '',
        locationName: '',
        instance: {},
        holdings: {},
        item: { barcode: uuid() },
      },
      universityTenant: {
        firstLocationId: '',
        firstLocationName: '',
        secondLocationId: '',
        secondLocationName: '',
        firstHoldings: {},
        secondHoldings: {
          callNumber: `callNumber${getRandomPostfix()}`,
          copyNumber: `copyNumber${getRandomPostfix()}`,
        },
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
      cy.withinTenant(Affiliations.College, () => {
        InventoryInstance.createInstanceViaApi()
          .then(({ instanceData }) => {
            testData.collegeTenant.instance = instanceData;

            ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' }).then(
              (servicePoints) => {
                testData.collegeTenant.holdings.location = Locations.getDefaultLocation({
                  servicePointId: servicePoints[0].id,
                }).location;
                Locations.createViaApi(testData.collegeTenant.holdings.location).then(
                  (location) => {
                    testData.collegeTenant.locationName = location.name;
                  },
                );
              },
            );
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              testData.collegeTenant.holdings.sourceId = folioSource.id;
            });
            cy.getLoanTypes({ limit: 1 }).then((res) => {
              testData.collegeTenant.item.loanTypeId = res[0].id;
            });
            cy.getMaterialTypes({ limit: 1 }).then((res) => {
              testData.collegeTenant.item.materialTypeId = res.id;
            });
          })
          .then(() => {
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.collegeTenant.instance.instanceId,
              permanentLocationId: testData.collegeTenant.holdings.location.id,
              sourceId: testData.collegeTenant.holdings.sourceId,
            }).then((holding) => {
              testData.collegeTenant.holdings = holding;

              InventoryItems.createItemViaApi({
                barcode: testData.collegeTenant.item.barcode,
                holdingsRecordId: testData.collegeTenant.holdings.id,
                materialType: { id: testData.collegeTenant.item.materialTypeId },
                permanentLoanType: { id: testData.collegeTenant.item.loanTypeId },
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              }).then((item) => {
                testData.collegeTenant.item = item;
              });

              InventoryInstance.shareInstanceViaApi(
                testData.collegeTenant.instance.instanceId,
                testData.consortiaId,
                Affiliations.College,
                Affiliations.Consortia,
              );
            });
          });
      });

      cy.withinTenant(Affiliations.University, () => {
        ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' })
          .then((servicePoints) => {
            testData.universityTenant.firstHoldings.location = Locations.getDefaultLocation({
              servicePointId: servicePoints[0].id,
            }).location;
            testData.universityTenant.secondHoldings.location = Locations.getDefaultLocation({
              servicePointId: servicePoints[0].id,
            }).location;
            Locations.createViaApi(testData.universityTenant.firstHoldings.location).then(
              (location) => {
                testData.universityTenant.firstLocationName = location.name;
              },
            );
            Locations.createViaApi(testData.universityTenant.secondHoldings.location).then(
              (location) => {
                testData.universityTenant.secondLocationName = location.name;
              },
            );
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              testData.universityTenant.firstHoldings.sourceId = folioSource.id;
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
              instanceId: testData.collegeTenant.instance.instanceId,
              permanentLocationId: testData.universityTenant.firstHoldings.location.id,
              sourceId: testData.universityTenant.firstHoldings.sourceId,
            }).then((holding) => {
              testData.universityTenant.firstHoldings = holding;

              InventoryItems.createItemViaApi({
                barcode: testData.universityTenant.item.barcode,
                holdingsRecordId: testData.universityTenant.firstHoldings.id,
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
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        InventoryInstances.searchByTitle(testData.collegeTenant.instance.instanceId);
        InventoryInstances.selectInstance();
        InstanceRecordView.waitLoading();
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      cy.withinTenant(Affiliations.College, () => {
        cy.deleteItemViaApi(testData.collegeTenant.item.id);
        cy.deleteHoldingRecordViaApi(testData.collegeTenant.holdings.id);
        Locations.deleteViaApi(testData.collegeTenant.holdings.location.id);
      });
      // InventoryInstance.deleteInstanceViaApi(testData.collegeTenant.instance.instanceId);
      // InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.universityTenant.item.barcode);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
        testData.collegeTenant.instance.instanceId,
      );
      cy.withinTenant(Affiliations.University, () => {
        // cy.deleteItemViaApi(testData.universityTenant.item.id);
        // cy.deleteHoldingRecordViaApi(testData.universityTenant.firstHoldings.id);
        // cy.deleteHoldingRecordViaApi(testData.universityTenant.secondHoldings.id);
        // InventoryInstance.deleteInstanceViaApi(testData.collegeTenant.instance.instanceId);
        Locations.deleteViaApi(testData.universityTenant.firstHoldings.location.id);
        Locations.deleteViaApi(testData.universityTenant.firstHoldings.location.id);
      });
      // cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
      // InventoryInstance.deleteInstanceViaApi(instance.id);
      // InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.collegeTenant.item.barcode);
      // cy.withinTenant(Affiliations.College, () => {
      //   // Locations.deleteViaApi(testData.collegeTenant.locationId);
      // });
      // cy.withinTenant(Affiliations.University, () => {
      // InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.universityTenant.item.barcode);
      //   Locations.deleteViaApi(testData.universityTenant.firstLocationId);
      //   Locations.deleteViaApi(testData.universityTenant.secondLocationId);
      // });
      // cy.withinTenant(Affiliations.College, () => {
      // cy.deleteItemViaApi(testData.collegeTenant.item.id);
      //   Locations.deleteViaApi(testData.collegeTenant.locationId);
      // });
    });

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
        ItemRecordView.updateOwnership(
          tenantNames.university,
          testData.universityTenant.firstLocationName,
        );
        InteractorsTools.checkCalloutMessage(
          `Ownership of item ${testData.collegeTenant.item.hrid} has been successfully updated to ${tenantNames.university}`,
        );
        InstanceRecordView.waitLoading();
        InstanceRecordView.verifyItemsCount(0, testData.collegeTenant.locationName);
        InstanceRecordView.expandConsortiaHoldings();
        InstanceRecordView.expandMemberSubHoldings(tenantNames.university);
        InstanceRecordView.verifyItemsCount(2, testData.universityTenant.firstLocationName);

        ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
        InventoryInstances.searchByTitle(testData.collegeTenant.instance.instanceId);
        InventoryInstances.selectInstance();
        InstanceRecordView.waitLoading();
        InstanceRecordView.addHoldings();
        InventoryNewHoldings.fillPermanentLocation(
          `${testData.universityTenant.secondLocationName} `,
        );
        InventoryNewHoldings.fillCallNumber(testData.universityTenant.secondHoldings.callNumber);
        InventoryNewHoldings.fillCopyNumber(testData.universityTenant.secondHoldings.copyNumber);
        InventoryNewHoldings.saveAndClose();
        InstanceRecordView.verifyInstanceRecordViewOpened();
        InstanceRecordView.verifyIsHoldingsCreated([
          `${testData.universityTenant.secondLocationName} >`,
        ]);

        ConsortiumManager.switchActiveAffiliation(tenantNames.university, tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        InventoryInstances.searchByTitle(testData.collegeTenant.instance.instanceId);
        InventoryInstances.selectInstance();
        InstanceRecordView.waitLoading();
        InstanceRecordView.clickAddItemByHoldingName({
          holdingName: testData.collegeTenant.locationName,
        });
        ItemRecordNew.fillItemRecordFields({
          materialType: 'book',
          loanType: 'Can circulate',
        });
        ItemRecordNew.saveAndClose({ itemSaved: true });
        InstanceRecordView.waitLoading();
        InstanceRecordView.openHoldingItem({
          name: testData.collegeTenant.locationName,
          barcode: 'No barcode',
        });
        ItemRecordView.clickUpdateOwnership();
        UpdateOwnershipModal.selectAffiliation(tenantNames.university);
        UpdateOwnershipModal.validateLocationDropdown(
          `${testData.universityTenant.secondLocationName} > ${testData.universityTenant.secondHoldings.callNumber} ${testData.universityTenant.secondHoldings.copyNumber}`,
        );
      },
    );
  });
});
