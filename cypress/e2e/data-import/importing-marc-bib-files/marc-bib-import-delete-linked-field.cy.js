import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import TestTypes from '../../../support/dictionary/testTypes';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Permissions from '../../../support/dictionary/permissions';
import DevTeams from '../../../support/dictionary/devTeams';
import Users from '../../../support/fragments/users/users';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import { LOCATION_NAMES, FOLIO_RECORD_TYPE, ACCEPTED_DATA_TYPE_NAMES, EXISTING_RECORDS_NAMES } from '../../../support/constants';

describe('Importing MARC Bib files', () => {
  const testData = {
    tag100: '100',
    tag010: '010',
  };
  const nameForUpdatedMarcBibFile = `C376946autotestFile${getRandomPostfix()}.mrc`;
  const nameForExportedMarcBibFile = `C376946autotestFile${getRandomPostfix()}.mrc`;
  const nameForCSVFile = `C376946autotestFile${getRandomPostfix()}.csv`;
  const mappingProfile = {
    name: 'C376946 Update MARC Bib records by matching 999 ff $s subfield value',
    typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
    update: true,
    permanentLocation: `"${LOCATION_NAMES.ANNEX}"`
  };
  const actionProfile = {
    typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
    name: 'C376946 Update MARC Bib records by matching 999 ff $s subfield value',
    action: 'Update (all record types except Orders, Invoices, or MARC Holdings)'
  };
  const matchProfile = {
    profileName: 'C376946 Update MARC Bib records by matching 999 ff $s subfield value',
    incomingRecordFields: {
      field: '999',
      in1: 'f',
      in2: 'f',
      subfield: 's'
    },
    existingRecordFields: {
      field: '999',
      in1: 'f',
      in2: 'f',
      subfield: 's'
    },
    matchCriterion: 'Exactly matches',
    existingRecordType: EXISTING_RECORDS_NAMES.MARC_BIBLIOGRAPHIC
  };
  const jobProfile = {
    ...NewJobProfile.defaultJobProfile,
    profileName: 'C376946 Update MARC Bib records by matching 999 ff $s subfield value',
    acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC
  };
  const marcFiles = [
    {
      marc: 'C376946MarcBib.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib'
    },
    {
      marc: 'C376946MarcAuth.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading: 'Chin, Staceyann, 1972- C376946',
      authority010FieldValue: 'n2008052404376946',
    }
  ];
  const createdRecordIDs = [];

  before('Creating user', () => {
    cy.createTempUser([
      Permissions.moduleDataImportEnabled.gui,
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiCanLinkUnlinkAuthorityRecordsToBibRecords.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.dataExportEnableApp.gui,
    ]).then(createdUserProperties => {
      testData.userProperties = createdUserProperties;
      marcFiles.forEach(marcFile => {
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
          DataImport.uploadFile(marcFile.marc, marcFile.fileName);
          JobProfiles.waitLoadingList();
          JobProfiles.searchJobProfileForImport(marcFile.jobProfileToRun);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(marcFile.fileName);
          Logs.checkStatusOfJobProfile('Completed');
          Logs.openFileDetails(marcFile.fileName);
          Logs.getCreatedItemsID().then(link => {
            createdRecordIDs.push(link.split('/')[5]);
          });
        });
      });

      cy.loginAsAdmin().then(() => {
        // create Match profile
        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfile(matchProfile);
        // create Field mapping profile
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.createMappingProfileForUpdatesMarc(mappingProfile);
        FieldMappingProfiles.closeViewModeForMappingProfile(mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);
        // create Action profile and link it to Field mapping profile
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(actionProfile, mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(actionProfile.name);
        // create Job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.openNewJobProfileForm();
        NewJobProfile.fillJobProfile(jobProfile);
        NewJobProfile.linkMatchProfile(matchProfile.profileName);
        NewJobProfile.linkActionProfileByName(actionProfile.name);
        // wait for the action profile to be linked
        cy.wait(1000);
        NewJobProfile.saveAndClose();
        JobProfiles.waitLoadingList();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);
      });

      // link MARC Bib field to MARC Authority
      cy.visit(TopMenu.inventoryPath).then(() => {
        InventoryInstances.waitContentLoading();
        InventoryInstance.searchByTitle(createdRecordIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        InventoryInstance.verifyAndClickLinkIcon(testData.tag100);
        MarcAuthorities.switchToSearch();
        InventoryInstance.verifySelectMarcAuthorityModal();
        InventoryInstance.verifySearchOptions();
        InventoryInstance.searchResults(marcFiles[1].authorityHeading);
        MarcAuthorities.checkFieldAndContentExistence(testData.tag010, `‡a ${marcFiles[1].authority010FieldValue}`);
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag100);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();
      });

      cy.login(testData.userProperties.username, testData.userProperties.password, { path: TopMenu.inventoryPath, waiter: InventoryInstances.waitContentLoading });
    });
  });

  after('delete test data', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
    MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
    // clean up generated profiles
    JobProfiles.deleteJobProfile(jobProfile.profileName);
    MatchProfiles.deleteMatchProfile(matchProfile.profileName);
    ActionProfiles.deleteActionProfile(actionProfile.name);
    FieldMappingProfiles.deleteFieldMappingProfile(mappingProfile.name);
    // delete created files in fixtures
    FileManager.deleteFile(`cypress/fixtures/${nameForExportedMarcBibFile}`);
    FileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
    FileManager.deleteFile(`cypress/fixtures/${nameForUpdatedMarcBibFile}`);
  });

  it('C376946 Delete non-repeatable linked field which is controlled by "MARC Authority" record (spitfire)', { tags: [TestTypes.criticalPath, DevTeams.spitfire] }, () => {
    InventoryInstance.searchByTitle(createdRecordIDs[0]);
    // download .csv file
    InventorySearchAndFilter.saveUUIDs();
    ExportFile.downloadCSVFile(nameForCSVFile, 'SearchInstanceUUIDs*');
    FileManager.deleteFolder(Cypress.config('downloadsFolder'));
    cy.visit(TopMenu.dataExportPath);
    // download exported marc file
    ExportFile.uploadFile(nameForCSVFile);
    ExportFile.exportWithDefaultJobProfile(nameForCSVFile);
    ExportFile.downloadExportedMarcFile(nameForExportedMarcBibFile);
    FileManager.deleteFolder(Cypress.config('downloadsFolder'));
    cy.log('#####End Of Export#####');

    DataImport.editMarcFile(
      nameForExportedMarcBibFile,
      nameForUpdatedMarcBibFile,
      ['0id.loc.gov/authorities/names/n2008052404376946'],
      ['']
    );

    // upload the exported marc file with 999.f.f.s fields
    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadFile(nameForUpdatedMarcBibFile, nameForUpdatedMarcBibFile);
    JobProfiles.waitLoadingList();
    JobProfiles.searchJobProfileForImport(jobProfile.profileName);
    JobProfiles.runImportFile();
    JobProfiles.waitFileIsImported(nameForUpdatedMarcBibFile);
    Logs.checkStatusOfJobProfile('Completed');
    Logs.openFileDetails(nameForUpdatedMarcBibFile);

    cy.visit(TopMenu.inventoryPath);
    InventoryInstance.searchByTitle('The other side of paradise : a memoir / Staceyann Chin. C376946');
    InventoryInstances.selectInstance();
    InventoryInstance.checkAbsenceOfAuthorityIconInInstanceDetailPane('Contributor');
    InventoryInstance.editMarcBibliographicRecord();
    cy.wait(15000);
    // QuickMarcEditor.verifyTagFieldAfterLinking(19, '100', '1', '\\', '$a Chin, Staceyann, $d 1972-', '$e Producer $e Narrator $u test', '$0 id.loc.gov/authorities/names/n2008052404', '$4 prf.');
    // QuickMarcEditor.verifyTagFieldAfterUnlinking(20, '245', '1', '4', '$a Paradise of other side (updated title) : $b a memoir / $c Staceyann Chin.');
  });
});
