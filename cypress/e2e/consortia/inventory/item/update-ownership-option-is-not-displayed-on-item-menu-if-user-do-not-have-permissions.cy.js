import uuid from 'uuid';
import { APPLICATION_NAMES, ITEM_STATUS_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordView, {
  actionsMenuOptions,
} from '../../../../support/fragments/inventory/item/itemRecordView';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Item', () => {
    const testData = {
      user: {},
      instance: {},
      holdings: {},
      item: { barcode: uuid() },
    };

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        testData.instance = instanceData;

        cy.setTenant(Affiliations.College)
          .then(() => {
            ServicePoints.getCircDesk1ServicePointViaApi().then(
              (servicePoint) => {
                const collegeLocationData = Locations.getDefaultLocation({
                  servicePointId: servicePoint.id,
                }).location;
                Locations.createViaApi(collegeLocationData).then((location) => {
                  testData.locationId = location.id;
                  testData.locationName = location.name;
                });
              },
            );
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              testData.holdings.sourceId = folioSource.id;
            });
            cy.getLoanTypes({ limit: 1 }).then((res) => {
              testData.item.loanTypeId = res[0].id;
            });
            cy.getMaterialTypes({ limit: 1 }).then((res) => {
              testData.item.materialTypeId = res.id;
            });
          })
          .then(() => {
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.instance.instanceId,
              permanentLocationId: testData.locationId,
              sourceId: testData.holdings.sourceId,
            }).then((holding) => {
              testData.holdings = holding;

              InventoryItems.createItemViaApi({
                barcode: testData.item.barcode,
                holdingsRecordId: holding.id,
                materialType: { id: testData.item.materialTypeId },
                permanentLoanType: { id: testData.item.loanTypeId },
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              }).then((item) => {
                testData.item = item;
              });
            });
          });
      });
      cy.resetTenant();

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiInventoryUpdateOwnership.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(testData.user.userId, [Permissions.inventoryAll.gui]);
        cy.resetTenant();

        cy.getAdminToken();
        cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
        cy.setTenant(Affiliations.University);
        cy.assignPermissionsToExistingUser(testData.user.userId, [
          Permissions.inventoryAll.gui,
          Permissions.uiInventoryUpdateOwnership.gui,
        ]);
        cy.resetTenant();

        cy.login(testData.user.username, testData.user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.waitContentLoading();
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        InventoryInstances.searchByTitle(testData.instance.instanceId);
        InventoryInstances.selectInstance();
        InstanceRecordView.waitLoading();
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.withinTenant(Affiliations.College, () => {
        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"id"=="${testData.instance.instanceId}"`,
        }).then((instance) => {
          cy.deleteItemViaApi(instance.items[0].id);
          cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        });
        Locations.deleteViaApi(testData.locationId);
      });
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
    });

    it(
      'C477591 "Update ownership" option is not displayed on Item menu if user don\'t have permissions (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet', 'C477591'] },
      () => {
        InstanceRecordView.openHoldingItem({
          name: testData.locationName,
          barcode: testData.item.barcode,
        });
        ItemRecordView.validateOptionInActionsMenu([
          { optionName: actionsMenuOptions.updateOwnership, shouldExist: false },
        ]);
      },
    );
  });
});
