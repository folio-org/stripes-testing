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
    const testData = {
      servicePoint: ServicePoints.defaultServicePoint,
    };

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        testData.instance = instanceData;
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.setTenant(Affiliations.College);
        cy.getCollegeAdminToken();
        const collegeLocationData = Locations.getDefaultLocation({
          servicePointId: ServicePoints.getDefaultServicePoint().id,
        }).location;
        Locations.createViaApi(collegeLocationData)
          .then((location) => {
            testData.collegeLocation = location;
          })
          .then(() => {
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.instance.instanceId,
              permanentLocationId: testData.collegeLocation.id,
            }).then(({ id: holdingId }) => {
              testData.instance.holdingId = holdingId;
            });
          });
        cy.resetTenant();

        cy.login(testData.user.username, testData.user.password);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        cy.setTenant(Affiliations.Consortia);
        cy.getAdminToken();
        cy.visit(TopMenu.inventoryPath);
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
      Users.deleteViaApi(testData.user);
      InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
    });

    // the test is marked as Obsolete in TestRail, so it is skipped
    it(
      'C411384 (CONSORTIA) Check Holdings "Actions" menu on Central tenant for a member librarys holdings record (consortia) (folijet)',
      { tags: [] },
      () => {
        InventoryInstances.searchByTitle(testData.instance.instanceTitle);
        InventoryInstances.selectInstance();
        cy.wait(4000);
        InventoryInstance.expandConsortiaHoldings();
        InventoryInstance.expandMemberSubHoldings(Affiliations.College);
        cy.wait(4000);
        InventoryInstance.openHoldingView();
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        HoldingsRecordView.checkActionsMenuOptions();
      },
    );
  });
});
