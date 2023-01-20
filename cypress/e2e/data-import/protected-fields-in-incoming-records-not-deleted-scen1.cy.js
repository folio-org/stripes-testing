import getRandomPostfix from '../../support/utils/stringTools';
import permissions from '../../support/dictionary/permissions';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import TopMenu from '../../support/fragments/topMenu';
import SettingsMenu from '../../support/fragments/settingsMenu';
import DataImport from '../../support/fragments/data_import/dataImport';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import FileDetails from '../../support/fragments/data_import/logs/fileDetails';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import MarcFieldProtection from '../../support/fragments/settings/dataImport/marcFieldProtection';
import Z3950TargetProfiles from '../../support/fragments/settings/inventory/z39.50TargetProfiles';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryEditMarcRecord from '../../support/fragments/inventory/inventoryEditMarcRecord';
import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';
import Users from '../../support/fragments/users/users';

describe('ui-data-import: Check that protected fields in incoming records are not deleted during import: Scenario 1', () => {
  let user = null;
  let instanceHrid = null;
  const protectedField = '856';
  const authentication = '100473910/PAOLF';
  const oclcForChanging = '466478385';
  const imported856Field = 'Notice et cote du catalogue de la Bibliothèque nationale de France ‡u http://catalogue.bnf.fr/ark:/12148/cb371881758';

  before(() => {
    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.settingsDataImportEnabled.gui,
      permissions.uiInventorySettingsConfigureSingleRecordImport.gui,
      permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      permissions.inventoryAll.gui,
      permissions.uiInventorySingleRecordImport.gui,
      permissions.uiInventoryViewCreateEditInstances.gui
    ])
      .then(userProperties => {
        user = userProperties;

        cy.login(user.username, user.password, { path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });

        const fileName = `C358968autotestFile.${getRandomPostfix()}.mrc`;

        Z3950TargetProfiles.changeOclcWorldCatToDefaultViaApi();
        DataImport.uploadFile('marcFileForC358968.mrc', fileName);
        JobProfiles.searchJobProfileForImport('Default - Create instance and SRS MARC Bib');
        JobProfiles.runImportFile(fileName);
        Logs.checkStatusOfJobProfile('Completed');
        Logs.openFileDetails(fileName);
        [FileDetails.columnName.srsMarc,
          FileDetails.columnName.instance].forEach(columnName => {
          FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable('1');
        FileDetails.checkInstanceQuantityInSummaryTable('1');

        // get Instance HRID through API
        InventorySearch.getInstanceHRID()
          .then(hrId => {
            instanceHrid = hrId;
          });
      });
  });

  after(() => {
    MarcFieldProtection.getListOfMarcFieldProtectionViaApi({ query: `"field"=="${protectedField}"` })
      .then(list => {
        list.forEach(({ id }) => MarcFieldProtection.deleteMarcFieldProtectionViaApi(id));
      });
    Z3950TargetProfiles.changeOclcWorldCatToDefaultViaApi();
    cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` })
      .then((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
    Users.deleteViaApi(user.userId);
  });

  it('C358968 Check that protected fields in incoming records are not deleted during import: Scenario 1 (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    cy.visit(SettingsMenu.marcFieldProtectionPath);
    MarcFieldProtection.currentListOfProtectedMarcFieldsIsPresented();
    MarcFieldProtection.createNewMarcFieldProtection();
    MarcFieldProtection.fillMarcFieldProtection(protectedField);
    MarcFieldProtection.checkFieldProtectionIsCreated(protectedField);

    cy.visit(SettingsMenu.targetProfilesPath);
    Z3950TargetProfiles.openOclcWorldCat();
    Z3950TargetProfiles.editOclcWorldCat(authentication);
    Z3950TargetProfiles.checkIsOclcWorldCatIsChanged(authentication);

    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchInstanceByHRID(instanceHrid);
    InventoryInstance.editMarcBibliographicRecord();
    InventoryEditMarcRecord.deleteField();
    InventoryInstance.checkElectronicAccess();
    InventoryInstance.startOverlaySourceBibRecord();
    InventoryInstance.singleRecordImportModalIsPresented();
    InventoryInstance.importWithOclc(oclcForChanging);
    InventoryInstance.checkCalloutMessage(`Updated record ${oclcForChanging}`);
    InventoryInstance.viewSource();
    InventoryViewSource.contains(`${protectedField}\t`);
    InventoryViewSource.contains(imported856Field);
  });
});
