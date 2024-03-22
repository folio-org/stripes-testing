import Permissions from '../../../../support/dictionary/permissions';
import getRandomPostfix from '../../../../support/utils/stringTools';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';

describe('Inventory', () => {
  describe('Instance', () => {
    let user;
    const testData = {
      filePath: 'oneMarcBib.mrc',
      marcFileName: `C409516 autotestFileName${getRandomPostfix()}.mrc`,
      instanceSource: 'MARC',
    };

    before('Create test data', () => {
      cy.getCollegeAdminToken();
      cy.getConsortiaId()
        .then((consortiaId) => {
          testData.consortiaId = consortiaId;
        })
        .then(() => {
          cy.setTenant(Affiliations.College);
          DataImport.uploadFileViaApi(
            testData.filePath,
            testData.marcFileName,
            DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          ).then((response) => {
            testData.instanceId = response[0].instance.id;

            InventoryInstance.shareInstanceViaApi(
              testData.response[0].instance.id,
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
                instanceId: testData.instanceIds[0],
                permanentLocationId: testData.collegeLocation.id,
              }).then((holding) => {
                testData.holding = holding;
              });
            });
          });
          cy.resetTenant();
        });

      cy.getAdminToken();
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        cy.assignAffiliationToUser(Affiliations.College, user.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(user.userId, [
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        ]);
        cy.resetTenant();

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      cy.setTenant(Affiliations.College);
      InventoryHoldings.deleteHoldingRecordViaApi(testData.holding.id);
      Locations.deleteViaApi(testData.collegeLocation);
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
    });

    it(
      'C409516 (CONSORTIA) Verify the behavior of "View holdings" option on member tenant shared Instance (consortia) (folijet)',
      { tags: ['criticalPathECS', 'folijet'] },
      () => {
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstance();
        InstanceRecordView.verifyInstanceSource('MARC');
        InstanceRecordView.openHoldingView();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.checkPermanentLocation(testData.collegeLocation.name);
      },
    );
  });
});
