import Permissions from '../../../../support/dictionary/permissions';
import getRandomPostfix from '../../../../support/utils/stringTools';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InstanceRecordEdit from '../../../../support/fragments/inventory/instanceRecordEdit';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';

describe('Inventory -> Instance -> Consortia', () => {
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

      // cy.assignAffiliationToUser(Affiliations.College, user.userId);
      // cy.setTenant(Affiliations.College);
      // cy.assignPermissionsToExistingUser(user.userId, [
      //  Permissions.inventoryAll.gui,
      // ]);

      cy.login(user.username, user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
      ConsortiumManager.switchActiveAffiliation(tenantNames.college);
    });
  });
  /*
  after('Delete test data', () => {
    cy.resetTenant();
    cy.getAdminToken();
    InventoryHoldings.deleteHoldingRecordViaApi(testData.instance.holdingId);
    InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
    Locations.deleteViaApi(testData.location);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(testData.user.userId);
  });
*/
  it(
    'C407751 (CONSORTIA) Verify the permission for editing shared instance on Member tenant (folijet)',
    { tags: ['smoke', 'folijet'] },
    () => {
      /*
      InventorySearchAndFilter.searchInstanceByTitle(testData.instance.instanceTitle);
      InstanceRecordView.verifyInstanceRecordViewOpened();
      InstanceRecordView.edit();
      InstanceRecordEdit.waitLoading();
      InstanceRecordEdit.fillResourceTitle(testData.newInstanceTitle);
      InstanceRecordEdit.saveAndClose();
      InteractorsTools.checkCalloutMessage(
        'This shared instance has been saved centrally, and updates to associated member library records are in process. Changes in this copy of the instance may not appear immediately.',
      );
      InstanceRecordView.verifyInstanceRecordViewOpened();
      InstanceRecordView.verifyResourceTitle(testData.newInstanceTitle);
      */
    },
  );
});
