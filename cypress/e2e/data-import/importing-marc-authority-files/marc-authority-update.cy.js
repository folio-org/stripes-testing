import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  LOCATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    const testData = {
      authorityTitle: 'C374186 Elizabeth II, Queen of Great Britain, 1926-',
      instanseTitle: 'Elizabeth',

      csvFile: `exportedCSVFile${getRandomPostfix()}.csv`,
      exportedMarcFile: `exportedMarcFile${getRandomPostfix()}.mrc`,
      modifiedMarcFile: `modifiedMarcFile${getRandomPostfix()}.mrc`,
      uploadModifiedMarcFile: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileName: `C374186 Update MARC authority records by matching 999 ff $s subfield value${getRandomPostfix()}`,
    };

    const mappingProfile = {
      name: `C374186 Update MARC authority records by matching 999 ff $s subfield value${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.MARCAUTHORITY,
      update: true,
      permanentLocation: `"${LOCATION_NAMES.ANNEX}"`,
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.MARCAUTHORITY,
      name: `C374186 Update MARC authority records by matching 999 ff $s subfield value${getRandomPostfix()}`,
      action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
    };
    const matchProfile = {
      profileName: `C374186 Update MARC authority records by matching 999 ff $s subfield value${getRandomPostfix()}`,
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
      existingRecordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C374186 Update MARC authority records by matching 999 ff $s subfield value${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    const marcFiles = [
      {
        marc: 'marcBibFileForC374186.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        numOfRecords: 1,
        propertyName: 'instance',
      },
      {
        marc: 'marcAuthFileC374186.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        numOfRecords: 1,
        propertyName: 'authority',
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

      cy.getAdminToken();
      marcFiles.forEach((marcFile) => {
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdAuthorityIDs.push(record[marcFile.propertyName].id);
          });
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
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);

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
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
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
        JobProfiles.waitFileIsUploaded();
        JobProfiles.waitLoadingList();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(testData.uploadModifiedMarcFile);
        Logs.checkStatusOfJobProfile('Completed');

        cy.visit(TopMenu.marcAuthorities);
        MarcAuthorities.searchBy('Keyword', 'Queen of G. Britain');
        MarcAuthority.contains('$a C374186 Elizabeth $b II, $c 1926-2022, $q Queen of G. Britain');

        cy.visit(TopMenu.inventoryPath);
        InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.verifyRecordStatus('Automated linking update');
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.verifyTagFieldAfterLinking(
          59,
          '700',
          '0',
          '\\',
          '$a C374186 Elizabeth $b II, $c 1926-2022, $q Queen of G. Britain',
          '',
          '$0 http://id.loc.gov/authorities/names/n80126296',
          '',
        );
      },
    );
  });
});
