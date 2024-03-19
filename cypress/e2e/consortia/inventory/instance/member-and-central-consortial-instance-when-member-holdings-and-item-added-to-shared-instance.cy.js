import uuid from 'uuid';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../../support/fragments/topMenu';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      instanceSource: 'FOLIO',
      barcode: uuid(),
    };

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        testData.instance = instanceData;

        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"id"=="${instanceData.instanceId}"`,
        }).then((instance) => {
          testData.instanceHRID = instance.hrid;
        });
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(testData.user.userId, [Permissions.inventoryAll.gui]);

        const collegeLocationData = Locations.getDefaultLocation({
          servicePointId: ServicePoints.getDefaultServicePoint().id,
        }).location;
        Locations.createViaApi(collegeLocationData).then((location) => {
          testData.collegeLocation = location;
        });

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
      ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
      ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
    });

    // after('Delete test data', () => {
    //   cy.resetTenant();
    //   cy.getAdminToken();
    //   Users.deleteViaApi(testData.user.userId);
    //   InventoryInstance.deleteInstanceViaApi(testData.sharedInstanceId[0]);
    //   cy.setTenant(Affiliations.College);
    //   InventoryHoldings.deleteHoldingRecordViaApi(testData.holding.id);
    //   Locations.deleteViaApi(testData.collegeLocation);
    // });

    it(
      'C411387 (CONSORTIA) Check member instance and central consortial instance when member holdings & item are added to a shared instance (consortia) (folijet)',
      { tags: ['criticalPathECS', 'folijet'] },
      () => {
        InventoryInstances.searchByTitle(testData.instance.instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.createHoldingsRecord(
          `${testData.collegeLocation.name} (${testData.collegeLocation.code}) `,
        );
        InventoryInstance.checkInstanceHrId(testData.instanceHRID);
        InstanceRecordView.verifyInstanceSource(testData.instanceSource);

        const ItemRecordNew = InventoryInstance.clickAddItemByHoldingName({
          holdingName: testData.collegeLocation.name,
          instanceTitle: testData.instance.instanceTitle,
        });
        ItemRecordNew.fillItemRecordFields({
          barcode: testData.barcode,
          materialType: 'book',
          loanType: 'Can circulate',
        });
        ItemRecordNew.saveAndClose({ itemSaved: true });
        InventoryInstance.waitLoading();
        InventoryInstance.openHoldingsAccordion(testData.collegeLocation.name);
        InventoryInstance.checkIsItemCreated(testData.barcode);

        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
        InventoryInstances.searchByTitle(testData.instance.instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.verifyConsortiaHoldingsAccordion();
        // Holdings created in step 3 is assigned to the shared Instance ("Consortial Holdings" accordion NOT the "Holdings" accordion)
        // Item created in step 5 is assigned to the holding in "Consortial Holdings" accordion
      },
    );
  });
});
