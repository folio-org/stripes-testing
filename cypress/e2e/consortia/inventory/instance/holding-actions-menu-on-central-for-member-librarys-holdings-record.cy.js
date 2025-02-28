import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe.skip('Inventory', () => {
  describe('Instance', () => {
    let user;
    const testData = {
      servicePoint: ServicePoints.defaultServicePoint,
    };

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstance.createInstanceViaApi()
        .then(({ instanceData }) => {
          testData.instance = instanceData;
        })
        .then(() => {
          cy.resetTenant();
          cy.setTenant(Affiliations.College);
          cy.getCollegeAdminToken();
          ServicePoints.createViaApi(testData.servicePoint).then(() => {
            testData.location = Locations.getDefaultLocation({
              servicePointId: testData.servicePoint.id,
            }).location;

            Locations.createViaApi(testData.location).then(() => {
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: testData.instance.instanceId,
                permanentLocationId: testData.location.id,
              }).then(({ id: holdingId }) => {
                testData.instance.holdingId = holdingId;
              });
            });
          });
        });

      cy.resetTenant();
      cy.getAdminToken();
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.setTenant(Affiliations.College);
      cy.getCollegeAdminToken();
      InventoryHoldings.deleteHoldingRecordViaApi(testData.instance.holdingId);
      Locations.deleteViaApi(testData.location);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
    });

    // the test is marked as Obsolete in TestRail, so it is skipped
    it(
      'C411384 (CONSORTIA) Check Holdings "Actions" menu on Central tenant for a member librarys holdings record (consortia) (folijet)',
      { tags: [] },
      () => {
        InventoryInstances.searchByTitle(testData.instance.instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.expandConsortiaHoldings();
        InventoryInstance.expandMemberSubHoldings(tenantNames.College);
        InventoryInstance.openHoldingView();
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        HoldingsRecordView.validateOptionInActionsMenu(
          { optionName: 'Edit', shouldExist: true },
          { optionName: 'Duplicate', shouldExist: true },
          { optionName: 'Delete', shouldExist: true },
        );
      },
    );
  });
});
