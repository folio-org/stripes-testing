import uuid from 'uuid';
import { APPLICATION_NAMES, ITEM_STATUS_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InstanceRecordView, {
  actionsMenuOptions,
} from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {
        user: {},
        instance: {},
        holdings: {},
        item: { barcode: uuid() },
      };
      const userPermissions = [Permissions.inventoryAll.gui, Permissions.uiInventoryMoveItems.gui];

      before('Create test data and login', () => {
        cy.getAdminToken();
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instance = instanceData;

          cy.setTenant(Affiliations.College)
            .then(() => {
              ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoint) => {
                const collegeLocationData = Locations.getDefaultLocation({
                  servicePointId: servicePoint.id,
                }).location;
                Locations.createViaApi(collegeLocationData).then((location) => {
                  testData.locationId = location.id;
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

        cy.createTempUser(userPermissions).then((userProperties) => {
          testData.user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, userPermissions);
          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(testData.user.userId, userPermissions);
          cy.resetTenant();

          cy.login(testData.user.username, testData.user.password);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        cy.deleteItemViaApi(testData.item.id);
        InventoryHoldings.deleteHoldingRecordViaApi(testData.holdings.id);
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
      });

      it(
        'C594480 (CONSORTIA) "Move items within an instance" is not visible for shared instances without local holdings on member tenant (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C594480'] },
        () => {
          InventorySearchAndFilter.searchInstanceByTitle(testData.instance.instanceId);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.validateOptionInActionsMenu(
            actionsMenuOptions.moveItemsWithinAnInstance,
            false,
          );

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
          InventoryInstances.searchByTitle(testData.instance.instanceId);
          InventoryInstances.selectInstance();
          InstanceRecordView.waitLoading();
          InstanceRecordView.validateOptionInActionsMenu(
            actionsMenuOptions.moveItemsWithinAnInstance,
            false,
          );

          ConsortiumManager.switchActiveAffiliation(tenantNames.university, tenantNames.college);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          InventoryInstances.searchByTitle(testData.instance.instanceId);
          InventoryInstances.selectInstance();
          InstanceRecordView.waitLoading();
          InstanceRecordView.validateOptionInActionsMenu(
            actionsMenuOptions.moveItemsWithinAnInstance,
            true,
          );
        },
      );
    });
  });
});
