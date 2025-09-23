import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  RECORD_STATUSES,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../../support/fragments/data_import/logs/logsViewAll';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Z3950TargetProfiles from '../../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const marcFile = {
        marc: 'oneMarcBib.mrc',
        fileName: `C418582 autotestFileName${getRandomPostfix()}.mrc`,
        editedFileName: `C418582 editedAutotestFileName${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        instanceTitle:
          'Anglo-Saxon manuscripts in microfiche facsimile Volume 25 Corpus Christi College, Cambridge II, MSS 12, 144, 162, 178, 188, 198, 265, 285, 322, 326, 449 microform A. N. Doane (editor and director), Matthew T. Hussey (associate editor), Phillip Pulsiano (founding editor)',
        newInstanceTitle: `Anglo-Saxon manuscripts in microfiche facsimile Volume 25 Corpus Christi College, Cambridge II, MSS 12, 144, 162, 178, 188, 198, 265, 285, 322, 326, 449 microform A. N. Doane (editor and director), Matthew T. Hussey (associate editor), Phillip Pulsiano (founding editor) ${getRandomPostfix()}`,
      };
      const testData = {
        OCLCAuthentication: '100481406/PAOLF',
        oclcNumber: '1234568',
        updatedInstanceTitle:
          'Rincões dos frutos de ouro (tipos e cenarios do sul baiano) [por] Saboia Ribeiro.',
      };

      before('Create test data', () => {
        DataImport.editMarcFile(
          marcFile.marc,
          marcFile.editedFileName,
          [marcFile.instanceTitle],
          [marcFile.newInstanceTitle],
        );
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        DataImport.uploadFileViaApi(
          marcFile.editedFileName,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          testData.instanceId = response[0].instance.id;
        });
        cy.resetTenant();

        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiInventorySingleRecordImport.gui,
          Permissions.uiInventoryViewCreateEditInstances.gui,
          Permissions.settingsDataImportView.gui,
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
              Permissions.settingsDataImportView.gui,
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
        FileManager.deleteFile(`cypress/fixtures/${marcFile.editedFileName}`);
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.setTenant(Affiliations.College);
        InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      });

      it(
        'C418582 (CONSORTIA) Verify Inventory Single Record Import and log on member tenant when overlaying Shared Source = MARC Instance (consortia) (folijet)',
        { tags: ['criticalPathECS', 'folijet', 'C418582'] },
        () => {
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(marcFile.newInstanceTitle);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InventoryInstance.startOverlaySourceBibRecord();
          InventoryInstance.overlayWithOclc(testData.oclcNumber);
          InventoryInstance.waitLoading();

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          Logs.openViewAllLogs();
          LogsViewAll.openUserIdAccordion();
          LogsViewAll.filterJobsByUser(`${testData.user.firstName} ${testData.user.lastName}`);
          LogsViewAll.waitUIToBeFiltered();
          LogsViewAll.openFileDetails('No file name');
          FileDetails.verifyTitle(
            testData.updatedInstanceTitle,
            FileDetails.columnNameInResultList.title,
          );
          [
            FileDetails.columnNameInResultList.srsMarc,
            FileDetails.columnNameInResultList.instance,
          ].forEach((columnName) => {
            FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
          });
          FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED);
        },
      );
    });
  });
});
