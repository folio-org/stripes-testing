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
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    let user;
    const testData = {
      newInstanceTitle: `C411384 instanceTitle${getRandomPostfix()}`,
      servicePoint: ServicePoints.defaultServicePoint,
    };

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstance.createInstanceViaApi()
        .then(({ instanceData }) => {
          testData.instance = instanceData;
        })
        .then(() => {
          cy.setTenant(Affiliations.College);
          ServicePoints.createViaApi(testData.servicePoint).then(() => {
            testData.location = Locations.getDefaultLocation({
              servicePointId: testData.servicePoint.id,
            }).location;

            Locations.createViaApi(testData.location).then(() => {
              InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: testData.instance.instanceId,
                  permanentLocationId: testData.location.id,
                  sourceId: folioSource.id,
                }).then(({ id: holdingId }) => {
                  testData.instance.holdingId = holdingId;
                });
              });
            });
          });
        });
      cy.resetTenant();
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        cy.assignAffiliationToUser(Affiliations.College, user.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(user.userId, [Permissions.inventoryAll.gui]).then(() => {
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      InventoryHoldings.deleteHoldingRecordViaApi(testData.instance.holdingId);
      InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
      Locations.deleteViaApi(testData.location);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C411384 (CONSORTIA) Check Holdings "Actions" menu on Central tenant for a member librarys holdings record',
      { tags: ['criticalPathECS', 'folijet'] },
      () => {
        InventoryInstances.searchByTitle(testData.instance.instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.expandConsortiaHoldings();
        InventoryInstance.expandMemberHoldings(tenantNames.college);
        InventoryInstance.openHoldingView();
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        HoldingsRecordView.checkActionsMenuOptions();
      },
    );
  });
});
