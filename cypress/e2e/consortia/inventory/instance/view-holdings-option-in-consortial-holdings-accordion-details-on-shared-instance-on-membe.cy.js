import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  HOLDINGS_SOURCE_NAMES,
  LOCATION_NAMES,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {
        marcFile: {
          path: 'oneMarcBib.mrc',
          fileName: `C411653 autotestFileName${getRandomPostfix()}.mrc`,
        },
      };

      before('Create test data and login', () => {
        cy.getAdminToken();
        cy.getConsortiaId().then((consortiaId) => {
          testData.consortiaId = consortiaId;

          cy.setTenant(Affiliations.College);
          DataImport.uploadFileViaApi(
            testData.marcFile.path,
            testData.marcFile.fileName,
            DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          )
            .then((response) => {
              testData.instanceId = response[0].instance.id;

              cy.getLocations({ query: `name="${LOCATION_NAMES.DCB_UI}"` }).then((res) => {
                testData.collegeLocation = res;

                InventoryHoldings.getHoldingSources({
                  limit: 1,
                  query: `(name=="${HOLDINGS_SOURCE_NAMES.FOLIO}")`,
                }).then((holdingSources) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: testData.instanceId,
                    permanentLocationId: testData.collegeLocation.id,
                    sourceId: holdingSources[0].id,
                  }).then((holding) => {
                    testData.collegeHolding = holding;
                  });
                });
              });
            })
            .then(() => {
              InventoryInstance.shareInstanceViaApi(
                testData.instanceId,
                testData.consortiaId,
                Affiliations.College,
                Affiliations.Consortia,
              );
            });
        });
        cy.resetTenant();

        cy.getAdminToken();
        cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
          testData.user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.uiInventoryViewInstances.gui,
          ]);
          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.uiInventoryViewInstances.gui,
          ]);
          cy.resetTenant();

          cy.login(testData.user.username, testData.user.password);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        InventoryHoldings.deleteHoldingRecordViaApi(testData.collegeHolding.id);
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      });

      it(
        'C411653 (CONSORTIA) Verify View holdings option in Consortial holdings accordion details on shared Instance on Member Tenant (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C411653'] },
        () => {
          InventorySearchAndFilter.searchInstanceByTitle(testData.instanceId);
          InventoryInstances.selectInstance();
          InventoryInstance.waitInstanceRecordViewOpened();
          InstanceRecordView.verifyConsortiaHoldingsAccordion(false);
          InstanceRecordView.expandConsortiaHoldings();
          InstanceRecordView.verifyMemberSubHoldingsAccordion(Affiliations.College);
          InstanceRecordView.expandMemberSubHoldings(tenantNames.college);
          InstanceRecordView.verifyMemberSubSubHoldingsAccordion(
            tenantNames.college,
            Affiliations.College,
            testData.collegeHolding.id,
          );
          InstanceRecordView.openHoldingView();
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.checkSource(HOLDINGS_SOURCE_NAMES.FOLIO);
          HoldingsRecordView.close();
          InventoryInstance.waitInstanceRecordViewOpened();
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
        },
      );
    });
  });
});
