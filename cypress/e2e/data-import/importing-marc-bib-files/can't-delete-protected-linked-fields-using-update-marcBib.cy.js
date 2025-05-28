import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  EXISTING_RECORDS_NAMES,
  FOLIO_RECORD_TYPE,
  LOCATION_NAMES,
  RECORD_STATUSES,
  DEFAULT_JOB_PROFILE_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {
      updated245Field: [20, '245', '1', '0', '$a C380519 Variations / $c Van L.  Beethoven.'],
      updated100Field: [
        18,
        '100',
        '1',
        '\\',
        '$a C380519 Ludwig van, Beethoven, $d 1770-1827',
        '$e composer.',
        '$0 http://id.loc.gov/authorities/names/n79107741',
        '',
      ],
      updated240Field: [
        19,
        '240',
        '1',
        '0',
        '$a Variations, $m piano, violin, cello, $n op. 44, $r E♭ major',
        '$c Ludwig Van Beethoven.',
        '$0 http://id.loc.gov/authorities/names/n83130832',
        '',
      ],
      updated700Field: [
        51,
        '700',
        '1',
        '\\',
        '$a C380519 Hewitt, Angela, $d 1958-',
        '$e instrumentalist, $e writer of supplementary textual content.',
        '$0 http://id.loc.gov/authorities/names/n91099716',
        '',
      ],
    };
    let firstFieldId = null;
    let secondFieldId = null;
    function replace999SubfieldsInPreupdatedFile(
      exportedFileName,
      preUpdatedFileName,
      finalFileName,
    ) {
      FileManager.readFile(`cypress/fixtures/${exportedFileName}`).then((actualContent) => {
        const lines = actualContent.split('');
        const field999data = lines[lines.length - 2];
        FileManager.readFile(`cypress/fixtures/${preUpdatedFileName}`).then((updatedContent) => {
          const content = updatedContent.split('\n');
          let firstString = content[0].slice();
          firstString = firstString.replace(
            'ffsfeb049c4-d32f-4844-a472-6202bf1abfd1id2e9d64f-cbe1-421c-9b63-45ef8625328c',
            field999data,
          );
          content[0] = firstString;
          FileManager.createFile(`cypress/fixtures/${finalFileName}`, content.join('\n'));
        });
      });
    }
    // unique file name to upload
    const nameForUpdatedMarcFile = `C380519autotestFile${getRandomPostfix()}.mrc`;
    const nameForExportedMarcFile = `C380519autotestFile${getRandomPostfix()}.mrc`;
    const nameForCSVFile = `C380519autotestFile${getRandomPostfix()}.csv`;
    const nameForPreUpdatedMarcBibFile = 'C380519MarcBibPreUpdated.mrc';
    const mappingProfile = {
      name: `C380519 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      update: true,
      permanentLocation: `"${LOCATION_NAMES.ANNEX}"`,
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      name: `C380519 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
      action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
    };
    const matchProfile = {
      profileName: `C380519 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
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
      existingRecordType: EXISTING_RECORDS_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C380519 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };
    const protectedFields = {
      firstField: '100',
      secondField: '700',
    };
    const marcFiles = [
      {
        marc: 'marcBibFileForC380519.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        numOfRecords: 1,
        propertyName: 'instance',
      },
      {
        marc: 'marcAuthFileForC380519.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        numOfRecords: 4,
        propertyName: 'authority',
      },
    ];
    const linkingTagAndValues = [
      {
        rowIndex: 17,
        value: 'C380519 Ludwig van, Beethoven, 1770-1827',
        tag: 100,
      },
      {
        rowIndex: 18,
        value:
          'C380519 Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
        tag: 240,
      },
      {
        rowIndex: 50,
        value: 'C380519 Hewitt, Angela, 1958-',
        tag: 700,
      },
    ];
    const createdAuthorityIDs = [];

    before('Creating user and test data', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C380519');

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.dataExportEnableApp.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;
        cy.loginAsAdmin()
          .then(() => {
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
          })
          .then(() => {
            cy.visit(TopMenu.inventoryPath);
            InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            linkingTagAndValues.forEach((linking) => {
              QuickMarcEditor.clickLinkIconInTagField(linking.rowIndex);
              MarcAuthorities.switchToSearch();
              InventoryInstance.verifySelectMarcAuthorityModal();
              InventoryInstance.verifySearchOptions();
              InventoryInstance.searchResults(linking.value);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyAfterLinkingUsingRowIndex(linking.tag, linking.rowIndex);
            });
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
          })
          .then(() => {
            // create Match profile
            cy.visit(SettingsMenu.matchProfilePath);
            MatchProfiles.createMatchProfile(matchProfile);
            // create Field mapping profile
            cy.visit(SettingsMenu.mappingProfilePath);
            FieldMappingProfiles.createMappingProfileForUpdatesMarc(mappingProfile);
            FieldMappingProfileView.closeViewMode(mappingProfile.name);
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
            NewJobProfile.linkActionProfileForMatches(actionProfile.name);
            // wait for the action profile to be linked
            cy.wait(1000);
            NewJobProfile.saveAndClose();
            JobProfiles.waitLoadingList();
            JobProfiles.checkJobProfilePresented(jobProfile.profileName);
          })
          .then(() => {
            MarcFieldProtection.createViaApi({
              indicator1: '*',
              indicator2: '*',
              subfield: '0',
              data: '*',
              source: 'USER',
              field: protectedFields.firstField,
            }).then((resp) => {
              firstFieldId = resp.id;
            });
            MarcFieldProtection.createViaApi({
              indicator1: '*',
              indicator2: '*',
              subfield: '9',
              data: '*',
              source: 'USER',
              field: protectedFields.secondField,
            }).then((resp) => {
              secondFieldId = resp.id;
            });
          });

        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete user and test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      if (createdAuthorityIDs[0]) InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
      createdAuthorityIDs.forEach((id, index) => {
        if (index) MarcAuthority.deleteViaAPI(id);
      });
      MarcFieldProtection.deleteViaApi(firstFieldId);
      MarcFieldProtection.deleteViaApi(secondFieldId);
      // clean up generated profiles
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      // delete created files in fixtures
      FileManager.deleteFile(`cypress/fixtures/${nameForExportedMarcFile}`);
      FileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
      FileManager.deleteFile(`cypress/fixtures/${nameForUpdatedMarcFile}`);
    });

    it(
      'C380519 Cant delete protected and linked fields using update MARC Bib profile (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire'] },
      () => {
        InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
        InventoryInstances.selectInstance();
        // download .csv file
        InventorySearchAndFilter.saveUUIDs();
        ExportFile.downloadCSVFile(nameForCSVFile, 'SearchInstanceUUIDs*');
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));
        cy.visit(TopMenu.dataExportPath);
        // download exported marc file
        ExportFile.uploadFile(nameForCSVFile);
        ExportFile.exportWithDefaultJobProfile(nameForCSVFile);
        ExportFile.downloadExportedMarcFile(nameForExportedMarcFile);
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));
        cy.log('#####End Of Export#####');

        // add 999 subfield values from exported file to pre-updated file with field 100 deleted
        replace999SubfieldsInPreupdatedFile(
          nameForExportedMarcFile,
          nameForPreUpdatedMarcBibFile,
          nameForUpdatedMarcFile,
        );

        // upload the exported marc file with 999.f.f.s fields
        cy.visit(TopMenu.dataImportPath);
        DataImport.verifyUploadState();
        DataImport.uploadFile(nameForUpdatedMarcFile, nameForUpdatedMarcFile);
        JobProfiles.waitLoadingList();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(nameForUpdatedMarcFile);
        Logs.checkJobStatus(nameForUpdatedMarcFile, 'Completed');
        Logs.openFileDetails(nameForUpdatedMarcFile);

        Logs.clickOnHotLink(0, 3, RECORD_STATUSES.UPDATED);
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.updated245Field);
        QuickMarcEditor.verifyTagFieldAfterLinking(...testData.updated100Field);
        QuickMarcEditor.verifyTagFieldAfterLinking(...testData.updated240Field);
        QuickMarcEditor.verifyTagFieldAfterLinking(...testData.updated700Field);
      },
    );
  });
});
