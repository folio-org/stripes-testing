import { APPLICATION_NAMES, ITEM_STATUS_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
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
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {
        instance: {},
        user: {},
        holdings: {},
        item: { barcode: getRandomPostfix() },
      };

      before('Create test data', () => {
        cy.getAdminToken();
        cy.getConsortiaId().then((consortiaId) => {
          testData.consortiaId = consortiaId;
        });
        cy.setTenant(Affiliations.College).then(() => {
          InventoryInstance.createInstanceViaApi()
            .then(({ instanceData }) => {
              testData.instance = instanceData;

              ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoint) => {
                const collegeLocationData = Locations.getDefaultLocation({
                  servicePointId: servicePoint.id,
                }).location;
                Locations.createViaApi(collegeLocationData).then((location) => {
                  testData.location = location;
                  testData.locationName = location.name;
                });
              });
              InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                testData.holdings.sourceId = folioSource.id;
              });
              cy.getLoanTypes({ limit: 1 }).then((res) => {
                testData.item.loanTypeId = res[0].id;
              });
              cy.getBookMaterialType().then((res) => {
                testData.item.materialTypeId = res.id;
              });
            })
            .then(() => {
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: testData.instance.instanceId,
                permanentLocationId: testData.location.id,
                sourceId: testData.holdings.sourceId,
              }).then((holding) => {
                testData.holdings = holding;

                InventoryItems.createItemViaApi({
                  barcode: testData.item.barcode,
                  holdingsRecordId: testData.holdings.id,
                  materialType: { id: testData.item.materialTypeId },
                  permanentLoanType: { id: testData.item.loanTypeId },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                }).then((item) => {
                  testData.item = item;
                });
              });

              InventoryInstance.shareInstanceViaApi(
                testData.instance.instanceId,
                testData.consortiaId,
                Affiliations.College,
                Affiliations.Consortia,
              );
            });
        });
        cy.resetTenant();

        cy.createTempUser([Permissions.uiInventoryViewCreateInstances.gui]).then(
          (userProperties) => {
            testData.user = userProperties;

            cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(testData.user.userId, [
              Permissions.inventoryAll.gui,
              Permissions.uiInventoryUpdateOwnership.gui,
            ]);
            cy.resetTenant();

            cy.login(testData.user.username, testData.user.password);
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventoryInstances.waitContentLoading();
          },
        );
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instance.instanceId);
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C526748 (CONSORTIA) Verify presence of update ownership action for Holdings when the permission for updating ownership is assigned on Member tenant (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C526748'] },
        () => {
          InventoryInstances.searchByTitle(testData.instance.instanceId);
          InventoryInstances.selectInstance();
          InstanceRecordView.waitLoading();
          InstanceRecordView.openHoldingView();
          HoldingsRecordView.checkHoldingRecordViewOpened();
          HoldingsRecordView.validateOptionInActionsMenu([
            { optionName: actionsMenuOptions.updateOwnership, shouldExist: true },
          ]);
          HoldingsRecordView.close();
          InstanceRecordView.waitLoading();
          InstanceRecordView.openHoldingItem({
            name: testData.locationName,
            barcode: testData.item.barcode,
          });
          ItemRecordView.validateOptionInActionsMenu([
            { optionName: actionsMenuOptions.updateOwnership, shouldExist: true },
          ]);
        },
      );
    });
  });
});
