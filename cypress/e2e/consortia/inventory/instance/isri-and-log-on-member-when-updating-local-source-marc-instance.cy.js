import { APPLICATION_NAMES, RECORD_STATUSES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import FileDetails from '../../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../../support/fragments/data_import/logs/logsViewAll';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Z3950TargetProfiles from '../../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {
        OCLCAuthentication: '100481406/PAOLF',
        oclcNumberForImport: '1234568',
        oclcNumberForOverlay: '1234566',
        jobProfileName: 'Inventory Single Record - Default Update Instance',
        fileName: 'No file name',
        instanceTitle: 'New ideas in chess / by Larry Evans.',
        localInstanceTitle:
          'Local instance • Rincões dos frutos de ouro (tipos e cenarios do sul baiano) [por] Saboia Ribeiro.  • P. Simone • 1933',
        updatedInstanceTitle:
          'Local instance • New ideas in chess / by Larry Evans.  • Pitman • 1958',
      };

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiInventorySingleRecordImport.gui,
          Permissions.uiInventoryViewCreateEditInstances.gui,
          Permissions.moduleDataImportEnabled.gui,
        ])
          .then((userProperties) => {
            testData.user = userProperties;
          })
          .then(() => {
            cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(testData.user.userId, [
              Permissions.uiInventorySingleRecordImport.gui,
              Permissions.uiInventoryViewCreateEditInstances.gui,
              Permissions.moduleDataImportEnabled.gui,
            ]);
            Z3950TargetProfiles.changeOclcWorldCatValueViaApi(testData.OCLCAuthentication);
            cy.resetTenant();

            cy.login(testData.user.username, testData.user.password);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.resetTenant();
        cy.setTenant(Affiliations.College);
        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"hrid"=="${testData.instanceHRID}"`,
        }).then((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
      });

      it(
        'C418586 (CONSORTIA) Verify Inventory Single Record Import and log on member tenant when updating Local Source = MARC Instance (consortia) (folijet)',
        { tags: ['criticalPathECS', 'folijet', 'C418586'] },
        () => {
          InventoryInstances.waitContentLoading();
          InventoryInstances.importWithOclc(testData.oclcNumberForImport);
          InventoryInstance.verifyInstanceTitle(testData.localInstanceTitle);
          InventoryInstance.startOverlaySourceBibRecord();
          InventoryInstance.overlayWithOclc(testData.oclcNumberForOverlay);
          InventoryInstance.waitLoading();

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          Logs.openViewAllLogs();
          LogsViewAll.openUserIdAccordion();
          LogsViewAll.filterJobsByUser(`${testData.user.firstName} ${testData.user.lastName}`);
          LogsViewAll.waitUIToBeFiltered();
          LogsViewAll.filterJobsByJobProfile(testData.jobProfileName);
          LogsViewAll.waitUIToBeFiltered();
          LogsViewAll.viewAllIsOpened();
          // cy.wait(8000);
          LogsViewAll.openFileDetails(testData.fileName);
          // cy.wait(4000);
          FileDetails.verifyTitle(testData.instanceTitle, FileDetails.columnNameInResultList.title);
          [
            FileDetails.columnNameInResultList.srsMarc,
            FileDetails.columnNameInResultList.instance,
          ].forEach((columnName) => {
            FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
          });
          FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED);
          InventoryInstance.verifyInstanceTitle(testData.updatedInstanceTitle);
          InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
            testData.instanceHRID = initialInstanceHrId;
          });
        },
      );
    });
  });
});
