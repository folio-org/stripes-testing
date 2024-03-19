import uuid from 'uuid';
import { LOCATION_NAMES } from '../../../../support/constants';
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
      permanentLocationOption: 'Online (E) ',
      permanentLocationValue: LOCATION_NAMES.ONLINE_UI,
      instanceSource: 'FOLIO',
      barcode: uuid(),
    };

    before('Create test data', () => {
      cy.getAdminToken();
      // cy.getConsortiaId().then((consortiaId) => {
      //   testData.consortiaId = consortiaId;
      // });
      // cy.setTenant(Affiliations.College);
      // InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
      //   testData.instance = instanceData;
      //   InventoryInstance.shareInstanceViaApi(
      //     testData.instance.instanceId,
      //     testData.consortiaId,
      //     Affiliations.College,
      //     Affiliations.Consortia,
      //   );
      // });
      // const collegeLocationData = Locations.getDefaultLocation({
      //   servicePointId: ServicePoints.getDefaultServicePoint().id,
      // }).location;
      // Locations.createViaApi(collegeLocationData).then((location) => {
      //   testData.collegeLocation = location;
      // });

      cy.resetTenant();
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
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instance = instanceData;
          InventoryInstance.shareInstanceViaApi(
            testData.instance.instanceId,
            testData.consortiaId,
            Affiliations.College,
            Affiliations.Consortia,
          );
        });

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
      });
    });

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
        InventoryInstance.checkInstanceHrId('colin');
        InstanceRecordView.verifyInstanceSource(testData.instanceSource);

        const ItemRecord = InventoryInstance.clickAddItemByHoldingName({
          holdingName: testData.collegeLocation.name,
          instanceTitle: testData.instance.instanceTitle,
        });
        ItemRecord.fillItemRecordFields({
          barcode: testData.barcode,
          materialType: 'book',
          loanType: 'Can circulate',
        });
        ItemRecord.saveAndClose({ itemSaved: true });
        InventoryInstance.waitLoading();
      },
    );
  });
});
