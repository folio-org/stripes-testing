import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import getRandomPostfix from '../../../support/utils/stringTools';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import FileManager from '../../../support/utils/fileManager';

describe('Data Import - Update MARC Authority files', () => {
  const testData = {
    mappingProfileName: `test mapping profile name.${getRandomPostfix()}`,
    actionProfileName: `test action profile name.${getRandomPostfix()}`,
    matchProfileName: `test match profile name.${getRandomPostfix()}`,
    jobProfileName: `Update MARC authority records by matching 999 ff $s subfield value.${getRandomPostfix()}`,

    authorityTitle: 'Elizabeth II, Queen of Great Britain, 1926-',
    instanseTitle: 'Elizabeth',

    csvFile: `exportedCSVFile${getRandomPostfix()}.csv`,
    exportedMarcFile: `exportedMarcFile${getRandomPostfix()}.mrc`,
    modifiedMarcFile: `modifiedMarcFile${getRandomPostfix()}.mrc`,
    uploadModifiedMarcFile: `testMarcFile.${getRandomPostfix()}.mrc`,
  };

  const incomingRecords = {
    type: 'MARC_AUTHORITY',
    field: '999',
    ind1: 'f',
    ind2: 'f',
    subfield: 's',
  };

  const existingRecords = incomingRecords;

  const marcFiles = [
    {
      marc: 'marcBibFileForC374186.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileC374186.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
  ]

  let createdAuthorityIDs = [];

  before(() => {
    cy.createTempUser([
      Permissions.moduleDataImportEnabled.gui,
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.dataExportEnableApp.gui,
    ]).then(createdUserProperties => {
      testData.userProperties = createdUserProperties;
    });

    NewFieldMappingProfile.createMappingProfileViaApiMarc(testData.mappingProfileName, 'MARC_AUTHORITY', 'MARC_AUTHORITY').then((mappingProfileResponse) => {
      NewActionProfile.createActionProfileViaApiMarc(testData.actionProfileName, 'UPDATE', 'MARC_AUTHORITY', mappingProfileResponse.body.id).then((actionProfileResponse) => {
        NewMatchProfile.createMatchProfileViaApiMarc(testData.matchProfileName, incomingRecords, existingRecords).then((matchProfileResponse) => {
          NewJobProfile.createJobProfileViaApi(testData.jobProfileName, matchProfileResponse.body.id, actionProfileResponse.body.id);
        });
      });
    });

    marcFiles.forEach(marcFile => {
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        DataImport.uploadFile(marcFile.marc, marcFile.fileName);
        JobProfiles.waitLoadingList();
        JobProfiles.searchJobProfileForImport(marcFile.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFile.fileName);
        Logs.checkStatusOfJobProfile('Completed');
        Logs.openFileDetails(marcFile.fileName);
        for (let i = 0; i < marcFile.numOfRecords; i++) {
          Logs.getCreatedItemsID(i).then(link => {
            createdAuthorityIDs.push(link.split('/')[5]);
          });
        };
      });
    });
  });

  // after(() => {
  //   Users.deleteViaApi(testData.userProperties.userId);
  //   JobProfiles.deleteJobProfile(testData.jobProfileName);
  //   MatchProfiles.deleteMatchProfile(testData.matchProfileName);
  //   ActionProfiles.deleteActionProfile(testData.actionProfileName);
  //   FieldMappingProfiles.deleteFieldMappingProfile(testData.mappingProfileName);

  //   if (createdAuthorityIDs[0]) InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
  //   createdAuthorityIDs.forEach((id, index) => {
  //     if (index) MarcAuthority.deleteViaAPI(id);
  //   });
  //   cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
  //   DataImport.selectLog();
  //   DataImport.openDeleteImportLogsModal();
  //   DataImport.confirmDeleteImportLogs();
  //   DataImport.selectLog();
  //   DataImport.openDeleteImportLogsModal();
  //   DataImport.confirmDeleteImportLogs();

  //   FileManager.deleteFolder(Cypress.config('downloadsFolder'));
  //   FileManager.deleteFile(`cypress/fixtures/${testData.modifiedMarcFile}`);
  //   FileManager.deleteFile(`cypress/fixtures/${testData.exportedMarcFile}`);
  //   FileManager.deleteFile(`cypress/fixtures/${testData.csvFile}`);
  // });

  it('C374186 Update "1XX" field value (edit controlling field) of linked "MARC Authority" record (spitfire)', { tags: [TestTypes.criticalPath, DevTeams.spitfire] }, () => {
    cy.login(testData.userProperties.username, testData.userProperties.password, { path: TopMenu.inventoryPath, waiter: InventoryInstances.waitContentLoading });
    InventoryInstance.searchByTitle(createdAuthorityIDs[0]);
    InventoryInstances.selectInstance();
    InventoryInstance.editMarcBibliographicRecord();
    InventoryInstance.verifyAndClickLinkIcon('700');

    MarcAuthorities.switchToSearch();
    InventoryInstance.verifySelectMarcAuthorityModal();
    InventoryInstance.verifySearchOptions();
    InventoryInstance.searchResults(testData.authorityTitle);
    InventoryInstance.clickLinkButton();
    QuickMarcEditor.verifyAfterLinkingAuthority('700');
    QuickMarcEditor.pressSaveAndClose();
    QuickMarcEditor.checkAfterSaveAndClose();

    cy.visit(TopMenu.marcAuthorities);
    MarcAuthorities.searchBy('Personal name', testData.authorityTitle);
    MarcAuthorities.selectAllRecords();
    MarcAuthorities.exportSelected();
    ExportFile.downloadCSVFile(testData.csvFile, 'QuickAuthorityExport*');

    cy.visit(TopMenu.dataExportPath);
    ExportFile.uploadFile(testData.csvFile);
    ExportFile.exportWithDefaultJobProfile(testData.csvFile, 'authority', 'Authorities');
    ExportFile.downloadExportedMarcFile(testData.exportedMarcFile);

    DataImport.editMarcFile(
      testData.exportedMarcFile,
      testData.modifiedMarcFile,
      ['cQueen of Great Britain', 'd1926-'],
      ['c1926-2022', 'qQueen of G. Britain']
    );
    
    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadFile(testData.modifiedMarcFile, testData.uploadModifiedMarcFile);
    JobProfiles.waitLoadingList();
    JobProfiles.searchJobProfileForImport(testData.jobProfileName);
    JobProfiles.searchJobProfileForImport('test111');
    JobProfiles.runImportFile();
    JobProfiles.waitFileIsImported(testData.uploadModifiedMarcFile);
    Logs.checkStatusOfJobProfile('Completed');

    cy.visit(TopMenu.marcAuthorities);
    MarcAuthorities.searchBy('Keyword', 'Queen of G. Britain');
    MarcAuthority.contains('‡a Elizabeth ‡b II, ‡c 1926-2022, ‡q Queen of G. Britain');

    cy.visit(TopMenu.inventoryPath);
    InventoryInstance.searchByTitle(createdAuthorityIDs[0]);
    InventoryInstances.selectInstance();
    InventoryInstance.verifyRecordStatus('Automated linking update');
    InventoryInstance.editMarcBibliographicRecord();
    QuickMarcEditor.verifyTagFieldAfterLinking(60, '700', '0', '\\', '$a Elizabeth  $b II,  $c 1926-2022,  $q Queen of G. Britain', '', '$0 id.loc.gov/authorities/names/n80126296', '');
  });
});