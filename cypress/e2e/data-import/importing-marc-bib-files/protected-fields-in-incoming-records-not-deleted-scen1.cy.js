import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import Parallelization from '../../../support/dictionary/parallelization';
import TopMenu from '../../../support/fragments/topMenu';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryEditMarcRecord from '../../../support/fragments/inventory/inventoryEditMarcRecord';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import Users from '../../../support/fragments/users/users';
import { TARGET_PROFILE_NAMES, JOB_STATUS_NAMES } from '../../../support/constants';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let user = null;
    let instanceHrid = null;
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const protectedFieldData = {
      protectedField: '856',
      in1: '*',
      in2: '*',
      subfield: '*',
      data: '*',
      source: 'User',
    };
    const OCLCAuthentication = '100481406/PAOLF';
    const oclcForChanging = '466478385';
    const imported856Field =
      'Notice et cote du catalogue de la Bibliothèque nationale de France ‡u http://catalogue.bnf.fr/ark:/12148/cb371881758';

    before('create test data', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.uiInventorySettingsConfigureSingleRecordImport.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiInventorySingleRecordImport.gui,
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.remoteStorageView.gui,
        Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });

        const fileName = `C358968autotestFile.${getRandomPostfix()}.mrc`;

        Z3950TargetProfiles.changeOclcWorldCatToDefaultViaApi();
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile('marcFileForC358968.mrc', fileName);
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable('1');
        FileDetails.checkInstanceQuantityInSummaryTable('1');

        // open Instance for getting hrid
        FileDetails.openInstanceInInventory('Created');
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHrid = initialInstanceHrId;
        });
      });
    });

    after('delete test data', () => {
      MarcFieldProtection.getListViaApi({
        query: `"field"=="${protectedFieldData.protectedField}"`,
      }).then((list) => {
        list.forEach(({ id }) => MarcFieldProtection.deleteViaApi(id));
      });
      Z3950TargetProfiles.changeOclcWorldCatToDefaultViaApi();
      Users.deleteViaApi(user.userId);
      cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
        (instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        },
      );
    });

    it(
      'C358968 Check that protected fields in incoming records are not deleted during import: Scenario 1 (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet, Parallelization.parallel] },
      () => {
        cy.visit(SettingsMenu.marcFieldProtectionPath);
        MarcFieldProtection.verifyListOfExistingSettingsIsDisplayed();
        MarcFieldProtection.create(protectedFieldData);
        MarcFieldProtection.verifyFieldProtectionIsCreated(protectedFieldData.protectedField);

        cy.visit(SettingsMenu.targetProfilesPath);
        Z3950TargetProfiles.openTargetProfile();
        Z3950TargetProfiles.editOclcWorldCat(
          OCLCAuthentication,
          TARGET_PROFILE_NAMES.OCLC_WORLDCAT,
        );
        Z3950TargetProfiles.checkIsOclcWorldCatIsChanged(OCLCAuthentication);

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
        cy.wait(1000);
        InventorySearchAndFilter.selectSearchResultItem();
        InventoryInstance.editMarcBibliographicRecord();
        InventoryEditMarcRecord.deleteField(29);
        InventoryEditMarcRecord.saveAndClose();
        InventoryEditMarcRecord.confirmDeletingField();
        InventoryInstance.checkElectronicAccess();
        InventoryInstance.startOverlaySourceBibRecord();
        InventoryInstance.singleOverlaySourceBibRecordModalIsPresented();
        InventoryInstance.overlayWithOclc(oclcForChanging);
        InventoryInstance.checkCalloutMessage(
          `Record ${oclcForChanging} updated. Results may take a few moments to become visible in Inventory`,
        );
        InventoryInstance.viewSource();
        InventoryViewSource.contains(`${protectedFieldData.protectedField}\t`);
        InventoryViewSource.contains(imported856Field);
      },
    );
  });
});
