import { DEFAULT_JOB_PROFILE_NAMES, INSTANCE_SOURCE_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
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
    describe('Consortia', () => {
      let user;
      const testData = {
        filePath: 'oneMarcBib.mrc',
        marcFileName: `C409516 autotestFileName${getRandomPostfix()}.mrc`,
        instanceSource: INSTANCE_SOURCE_NAMES.MARC,
      };

      before('Create test data', () => {
        cy.getAdminToken();
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
                response[0].instance.id,
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
                InventoryHoldings.getHoldingsFolioSource().then((holdingSources) => {
                  testData.holdingSource = holdingSources.id;

                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: testData.instanceId,
                    permanentLocationId: testData.collegeLocation.id,
                    sourceId: holdingSources.id,
                  }).then((holding) => {
                    testData.holding = holding;
                  });
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
      });

      it(
        'C409516 (CONSORTIA) Verify the behavior of "View holdings" option on member tenant shared Instance (consortia) (folijet)',
        { tags: ['criticalPathECS', 'folijet', 'C409516'] },
        () => {
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(testData.instanceId);
          InventoryInstances.selectInstance();
          InstanceRecordView.verifyInstanceSource(testData.instanceSource);
          InstanceRecordView.openHoldingView();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.checkPermanentLocation(testData.collegeLocation.name);
        },
      );
    });
  });
});
