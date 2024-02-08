import { JOB_STATUS_NAMES, RECORD_STATUSES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../../support/fragments/data_import/logs/logsViewAll';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Z3950TargetProfiles from '../../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    const marcFile = {
      marc: 'oneMarcBib.mrc',
      fileNameImported: `C418582 autotestFileName${getRandomPostfix()}.mrc`,
      editedFileName: `C418582 editedAutotestFileName${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
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
      cy.loginAsAdmin();
      ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
      ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
      cy.visit(TopMenu.dataImportPath);
      DataImport.verifyUploadState();
      DataImport.uploadFileAndRetry(marcFile.editedFileName, marcFile.fileNameImported);
      JobProfiles.waitLoadingList();
      JobProfiles.search(marcFile.jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(marcFile.fileNameImported);
      Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
      Logs.openFileDetails(marcFile.fileNameImported);
      Logs.getCreatedItemID().then((instanceId) => {
        testData.instanceId = instanceId;
      });
      cy.resetTenant();

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
          cy.visit(TopMenu.inventoryPath);
        });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      cy.setTenant(Affiliations.College);
      cy.getInstance({
        limit: 1,
        expandAll: true,
        query: `"hrid"=="${testData.instanceHRID}"`,
      }).then((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
      FileManager.deleteFile(`cypress/fixtures/${marcFile.editedFileName}`);
    });

    it(
      'C418582 (CONSORTIA) Verify Inventory Single Record Import and log on member tenant when overlaying Shared Source = MARC Instance (consortia) (folijet)',
      { tags: ['criticalPathECS', 'folijet'] },
      () => {
        InventoryInstances.searchByTitle(marcFile.newInstanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.startOverlaySourceBibRecord();
        InventoryInstance.overlayWithOclc(testData.oclcNumber);
        InventoryInstance.waitLoading();

        cy.visit(TopMenu.dataImportPath);
        Logs.openViewAllLogs();
        LogsViewAll.openUserIdAccordion();
        LogsViewAll.filterJobsByUser(`${testData.user.firstName} ${testData.user.lastName}`);
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
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          testData.instanceHRID = initialInstanceHrId;
        });
      },
    );
  });
});
