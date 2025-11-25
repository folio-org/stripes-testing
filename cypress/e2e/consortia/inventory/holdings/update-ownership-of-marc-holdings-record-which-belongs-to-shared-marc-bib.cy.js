import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  LOCATION_NAMES,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Holdings', () => {
    describe('Consortia', () => {
      const testData = {
        filePath: 'oneMarcBib.mrc',
        fileNameForCreateInstance: `C788750 autotestFile${getRandomPostfix()}.mrc`,
      };
      const userMemberTenantsPermissions = [
        Permissions.inventoryAll.gui,
        Permissions.uiInventoryUpdateOwnership.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
      ];

      before('Create test data', () => {
        cy.getAdminToken();
        DataImport.uploadFileViaApi(
          testData.filePath,
          testData.fileNameForCreateInstance,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        ).then((response) => {
          testData.instanceHrid = response[0].instance.hrid;
          testData.instanceId = response[0].instance.id;

          cy.resetTenant();
          cy.setTenant(Affiliations.College)
            .then(() => {
              cy.getLocations({ query: `name="${LOCATION_NAMES.DCB_UI}"` }).then((res) => {
                testData.location = res;
              });
            })
            .then(() => {
              cy.createSimpleMarcHoldingsViaAPI(
                testData.instanceId,
                testData.instanceHrid,
                testData.location.code,
              ).then(() => {
                cy.getHoldings({ limit: 1, query: `"instanceId"="${testData.instanceId}"` }).then(
                  (holdings) => {
                    testData.holding = holdings[0];
                  },
                );
              });
            });
        });

        cy.withinTenant(Affiliations.University, () => {
          ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoint) => {
            testData.location = Locations.getDefaultLocation({
              servicePointId: servicePoint.id,
            }).location;
            Locations.createViaApi(testData.location).then((location) => {
              testData.location.id = location.id;
            });
          });
        });

        cy.resetTenant();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiInventoryUpdateOwnership.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          [Affiliations.College, Affiliations.University].forEach((affiliation) => {
            cy.affiliateUserToTenant({
              tenantId: affiliation,
              userId: testData.user.userId,
              permissions: userMemberTenantsPermissions,
            });
          });

          cy.login(testData.user.username, testData.user.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        cy.setTenant(Affiliations.University);
        cy.deleteHoldingRecordViaApi(testData.holding.id);
        Locations.deleteViaApi(testData.location);
        cy.withinTenant(Affiliations.Consortia, () => {
          cy.getAdminToken();
          InventoryInstance.deleteInstanceViaApi(testData.instanceId);
          Users.deleteViaApi(testData.user.userId);
        });
      });

      it(
        'C788750 Update ownership of MARC holdings record which belongs to Shared MARC bib (consortia) (folijet)',
        { tags: ['criticalPathECS', 'folijet', 'C788750'] },
        () => {
          InventoryInstances.searchByTitle(testData.instanceId);
          InventoryInstances.selectInstance();
          InstanceRecordView.waitLoading();
          InstanceRecordView.openHoldingView();
          HoldingsRecordView.checkHoldingRecordViewOpened();
          ['cancel', 'confirm'].forEach((action) => {
            HoldingsRecordView.updateOwnership(
              tenantNames.university,
              action,
              testData.holding.hrid,
              tenantNames.college,
              testData.location.name,
            );
          });
          InstanceRecordView.waitLoading();
          InstanceRecordView.verifyConsortiaHoldingsAccordion(testData.instanceId, false);
          InstanceRecordView.expandConsortiaHoldings();
          InstanceRecordView.verifyMemberSubHoldingsAccordionAbsent(Affiliations.College);
          InstanceRecordView.verifyMemberSubHoldingsAccordion(Affiliations.University);
          InstanceRecordView.expandMemberSubHoldings(tenantNames.university);
          InstanceRecordView.verifyIsHoldingsCreated([`${testData.location.name} >`]);
          InstanceRecordView.openHoldingView();
          HoldingsRecordView.checkHoldingRecordViewOpened();
          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();
        },
      );
    });
  });
});
