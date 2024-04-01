import Affiliations from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      servicePoint: ServicePoints.defaultServicePoint,
    };

    before('Create test data', () => {
      cy.getAdminToken();
      cy.getConsortiaId().then((consortiaId) => {
        testData.consortiaId = consortiaId;
      });
      cy.setTenant(Affiliations.College);
      cy.getCollegeAdminToken();
      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        testData.instance = instanceData;
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
              cy.getLoanTypes({ limit: 1 }).then((res) => {
                testData.loanTypeId = res[0].id;
              });
              cy.getMaterialTypes({ limit: 1 }).then((res) => {
                testData.materialTypeId = res.id;
              });
              InventoryItems.createItemViaApi({
                holdingsRecordId: holdingId,
                materialType: { id: testData.materialTypeId },
                permanentLoanType: { id: testData.loanTypeId },
                status: { name: 'Available' },
              }).then((item) => {
                testData.item = item;
              });
            });
          });
        });

        InventoryInstance.shareInstanceViaApi(
          testData.instance.instanceId,
          testData.consortiaId,
          Affiliations.College,
          Affiliations.Consortia,
        );
      });

      cy.resetTenant();
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;
        cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(testData.user.userId, [Permissions.inventoryAll.gui]);
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      cy.setTenant(Affiliations.College);
      cy.deleteItemViaApi(testData.item.id);
      InventoryHoldings.deleteHoldingRecordViaApi(testData.instance.holdingId);
      Locations.deleteViaApi(testData.location);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
      cy.resetTenant();
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C411616 (CONSORTIA) Verify the Consortial holdings accordion details on shared Instance in Central Tenant (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        InventoryInstances.searchByTitle(testData.instance.instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        // InventoryInstance.verifyConsortiaHoldingsAccordion(false);
        // InventoryInstance.expandConsortiaHoldings();
        InventoryInstance.expandMemberSubHoldings(Affiliations.College);
        InventoryInstance.expandMemberSubSubHoldings(
          Affiliations.College,
          testData.instance.holdingId,
        );
      },
    );
  });
});
