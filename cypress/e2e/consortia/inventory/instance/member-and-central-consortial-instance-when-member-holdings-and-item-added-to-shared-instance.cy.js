import uuid from 'uuid';
import { INSTANCE_SOURCE_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {
        instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
        itemBarcode: uuid(),
      };

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instance = instanceData;
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
          cy.getInstance({
            limit: 1,
            expandAll: true,
            query: `"id"=="${testData.instance.instanceId}"`,
          }).then((instance) => {
            testData.instanceHRID = instance.hrid;
          });

          cy.resetTenant();
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"id"=="${testData.instance.instanceId}"`,
        }).then((instance) => {
          cy.deleteItemViaApi(instance.items[0].id);
          cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        });
        Locations.deleteViaApi(testData.collegeLocation);
        cy.resetTenant();
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
      });

      it(
        'C411387 (CONSORTIA) Check member instance and central consortial instance when member holdings & item are added to a shared instance (consortia) (folijet)',
        { tags: ['criticalPathECS', 'folijet', 'C411387'] },
        () => {
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(testData.instance.instanceId);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InventoryInstance.createHoldingsRecord(
            `${testData.collegeLocation.name} (${testData.collegeLocation.code}) `,
          );
          InventoryInstance.checkInstanceHrId(testData.instanceHRID);
          // need to reload page because source is FOLIO-shared
          cy.reload();
          InstanceRecordView.verifyInstanceSource(testData.instanceSource);

          const ItemRecordNew = InventoryInstance.clickAddItemByHoldingName({
            holdingName: testData.collegeLocation.name,
            instanceTitle: testData.instance.instanceTitle,
          });
          ItemRecordNew.fillItemRecordFields({
            barcode: testData.itemBarcode,
            materialType: 'book',
            loanType: 'Can circulate',
          });
          ItemRecordNew.saveAndClose({ itemSaved: true });
          InventoryInstance.waitLoading();
          InventoryInstance.openHoldingsAccordion(testData.collegeLocation.name);
          InventoryInstance.checkIsItemCreated(testData.itemBarcode);

          cy.resetTenant();
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
          InventorySearchAndFilter.searchInstanceByHRID(testData.instanceHRID);
          InventoryInstance.waitLoading();
          InventoryInstance.verifyConsortiaHoldingsAccordion(false);
          InventoryInstance.expandConsortiaHoldings();
          InventoryInstance.verifyMemberSubHoldingsAccordion(Affiliations.College);
          InventoryInstance.expandMemberSubHoldings('College');
          InventoryInstance.openHoldingsAccordion(testData.collegeLocation.name);
          InventoryInstance.checkIsItemCreated(testData.itemBarcode);
        },
      );
    });
  });
});
