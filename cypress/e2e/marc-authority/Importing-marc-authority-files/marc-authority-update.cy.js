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
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import FileManager from '../../../support/utils/fileManager';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Parallelization from '../../../support/dictionary/parallelization';
import {
  LOCATION_NAMES,
  FOLIO_RECORD_TYPE,
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
} from '../../../support/constants';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';

describe('Data Import - Update MARC Authority files', () => {
  const testData = {
    authorityTitle: 'Elizabeth II, Queen of Great Britain, 1926-',
    instanseTitle: 'Elizabeth',

    csvFile: `exportedCSVFile${getRandomPostfix()}.csv`,
    exportedMarcFile: `exportedMarcFile${getRandomPostfix()}.mrc`,
    modifiedMarcFile: `modifiedMarcFile${getRandomPostfix()}.mrc`,
    uploadModifiedMarcFile: `testMarcFile.${getRandomPostfix()}.mrc`,
    jobProfileName: 'Update MARC authority records by matching 999 ff $s subfield value',
  };

  const mappingProfile = {
    name: 'Update MARC authority records by matching 999 ff $s subfield value',
    typeValue: FOLIO_RECORD_TYPE.MARCAUTHORITY,
    update: true,
    permanentLocation: `"${LOCATION_NAMES.ANNEX}"`,
  };
  const actionProfile = {
    typeValue: FOLIO_RECORD_TYPE.MARCAUTHORITY,
    name: 'Update MARC authority records by matching 999 ff $s subfield value',
    action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
  };
  const matchProfile = {
    profileName: 'Update MARC authority records by matching 999 ff $s subfield value',
    incomingRecordFields: {
      field: '999',
      in1: 'f',
      in2: 'f',
      subfield: 's',
    },
    existingRecordFields: {
      field: '999',
      in1: 'f',
      in2: 'f',
      subfield: 's',
    },
    matchCriterion: 'Exactly matches',
    existingRecordType: EXISTING_RECORDS_NAMES.MARC_AUTHORITY,
  };
  const jobProfile = {
    ...NewJobProfile.defaultJobProfile,
    profileName: 'Update MARC authority records by matching 999 ff $s subfield value',
    acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
  };

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
  ];

  const createdAuthorityIDs = [];

  before(() => {
    cy.createTempUser([
      Permissions.moduleDataImportEnabled.gui,
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.dataExportEnableApp.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;
    });

    marcFiles.forEach((marcFile) => {
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        DataImport.uploadFile(marcFile.marc, marcFile.fileName);
        JobProfiles.waitLoadingList();
        JobProfiles.search(marcFile.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFile.fileName);
        Logs.checkStatusOfJobProfile('Completed');
        Logs.openFileDetails(marcFile.fileName);
        for (let i = 0; i < marcFile.numOfRecords; i++) {
          Logs.getCreatedItemsID(i).then((link) => {
            createdAuthorityIDs.push(link.split('/')[5]);
          });
        }
      });
    });

    cy.loginAsAdmin().then(() => {
      // create Field mapping profile
      cy.visit(SettingsMenu.mappingProfilePath);
      FieldMappingProfiles.createMappingProfileForUpdatesMarcAuthority(mappingProfile);
      FieldMappingProfileView.closeViewMode(mappingProfile.name);
      FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);
      // create Action profile and link it to Field mapping profile
      cy.visit(SettingsMenu.actionProfilePath);
      ActionProfiles.create(actionProfile, mappingProfile.name);
      ActionProfiles.checkActionProfilePresented(actionProfile.name);
      // create Match profile
      cy.visit(SettingsMenu.matchProfilePath);
      MatchProfiles.createMatchProfile(matchProfile);
      // create Job profile
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.openNewJobProfileForm();
      NewJobProfile.fillJobProfile(jobProfile);
      NewJobProfile.linkMatchProfile(matchProfile.profileName);
      NewJobProfile.linkActionProfileForMatches(actionProfile.name);
      // wait for the action profile to be linked
      cy.wait(1000);
      NewJobProfile.saveAndClose();
      JobProfiles.waitLoadingList();
      JobProfiles.checkJobProfilePresented(jobProfile.profileName);
    });
  });

  after(() => {
    Users.deleteViaApi(testData.userProperties.userId);
    JobProfiles.deleteJobProfile(jobProfile.profileName);
    MatchProfiles.deleteMatchProfile(matchProfile.profileName);
    ActionProfiles.deleteActionProfile(actionProfile.name);
    FieldMappingProfileView.deleteViaApi(mappingProfile.name);

    if (createdAuthorityIDs[0]) InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
    createdAuthorityIDs.forEach((id, index) => {
      if (index) MarcAuthority.deleteViaAPI(id);
    });

    FileManager.deleteFolder(Cypress.config('downloadsFolder'));
    FileManager.deleteFile(`cypress/fixtures/${testData.modifiedMarcFile}`);
    FileManager.deleteFile(`cypress/fixtures/${testData.exportedMarcFile}`);
    FileManager.deleteFile(`cypress/fixtures/${testData.csvFile}`);
  });

  it(
    'C374186 Update "1XX" field value (edit controlling field) of linked "MARC Authority" record (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire, Parallelization.nonParallel] },
    () => {
      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
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
        ['c1926-2022', 'qQueen of G. Britain'],
      );

      cy.visit(TopMenu.dataImportPath);
      DataImport.uploadFile(testData.modifiedMarcFile, testData.uploadModifiedMarcFile);
      JobProfiles.waitLoadingList();
      JobProfiles.search(testData.jobProfileName);
      JobProfiles.search('test111');
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
      QuickMarcEditor.verifyTagFieldAfterLinking(
        60,
        '700',
        '0',
        '\\',
        '$a Elizabeth $b II, $c 1926-2022, $q Queen of G. Britain',
        '',
        '$0 id.loc.gov/authorities/names/n80126296',
        '',
      );
    },
  );
});
