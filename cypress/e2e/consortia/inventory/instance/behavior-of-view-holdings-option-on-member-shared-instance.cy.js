import Permissions from '../../../../support/dictionary/permissions';
import getRandomPostfix from '../../../../support/utils/stringTools';
// import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import { JOB_STATUS_NAMES } from '../../../../support/constants';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';

describe('Inventory', () => {
  describe('Instance', () => {
    let user;
    const testData = {
      filePath: 'oneMarcBib.mrc',
      marcFileName: `C409516 autotestFileName ${getRandomPostfix()}`,
      instanceIds: [],
      instanceSource: 'MARC',
    };

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        cy.assignAffiliationToUser(Affiliations.College, user.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(user.userId, [
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        ]);
        cy.getConsortiaId()
          .then((consortiaId) => {
            testData.consortiaId = consortiaId;
          })
          .then(() => {
            cy.loginAsAdmin({
              path: TopMenu.dataImportPath,
              waiter: DataImport.waitLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            DataImport.uploadFileViaApi(testData.filePath, testData.marcFileName);
            Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
            Logs.openFileDetails(testData.marcFileName);
            Logs.getCreatedItemsID().then((link) => {
              testData.instanceIds.push(link.split('/')[5]);
            });

            InventoryInstance.shareInstanceViaApi(
              testData.testData.instanceIds[0],
              testData.consortiaId,
              Affiliations.College,
              Affiliations.Consortia,
            );
            // adding Holdings for shared Instance
            const collegeLocationData = Locations.getDefaultLocation({
              servicePointId: ServicePoints.getDefaultServicePoint().id,
            }).location;
            Locations.createViaApi(collegeLocationData).then((location) => {
              testData.collegeLocation = location;
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: testData.testData.instanceIds[0],
                permanentLocationId: testData.collegeLocation.id,
              }).then((holding) => {
                testData.collegeHoldings.push(holding);
              });
            });
          });
        cy.resetTenant();

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
      });
    });

    // after('Delete test data', () => {
    //   cy.resetTenant();
    //   cy.getAdminToken();
    //   InventoryHoldings.deleteHoldingRecordViaApi(testData.instance.holdingId);
    //   InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
    //   Locations.deleteViaApi(testData.location);
    //   ServicePoints.deleteViaApi(testData.servicePoint.id);
    //   Users.deleteViaApi(user.userId);
    // });

    it(
      'C409516 (CONSORTIA) Verify the behavior of "View holdings" option on member tenant shared Instance (consortia) (folijet)',
      { tags: ['criticalPathECS', 'folijet'] },
      () => {
        InventoryInstances.searchByTitle(testData.testData.instanceIds[0]);
        InventoryInstances.selectInstance();
        InstanceRecordView.verifyInstanceSource('MARC');
        InventoryInstance.expandConsortiaHoldings();
        InventoryInstance.expandMemberHoldings(tenantNames.college);
        InventoryInstance.openHoldingView();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.checkPermanentLocation(testData.collegeLocation.name);
      },
    );
  });
});
