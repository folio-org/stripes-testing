import {
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
  FOLIO_RECORD_TYPE,
  LOCATION_NAMES,
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
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {
      updated110Field: [
        20,
        '110',
        '1',
        '\\',
        '$a C374189 Chin, Staceyann, $d 1972- $e author. $0 id.loc.gov/authorities/names/n2008052404',
      ],
      updated600Field: [
        31,
        '600',
        '1',
        '0',
        '$a C374189 Chin, Staceyann, $d 1972-',
        '$x Childhood and youth.',
        '$0 id.loc.gov/authorities/names/n2008052404',
        '',
      ],
      instanceTitle: 'C374189 The other side of paradise : a memoir / Staceyann Chin.',
    };
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
            'ffs148d48b8-08db-4f6f-9de5-2457ff1001a2i08ad79f1-7cec-4913-a835-1efdce8c31cb',
            field999data,
          );
          content[0] = firstString;
          FileManager.createFile(`cypress/fixtures/${finalFileName}`, content.join('\n'));
        });
      });
    }
    // unique file name to upload
    const nameForUpdatedMarcFile = `C374189autotestFile${getRandomPostfix()}.mrc`;
    const nameForExportedMarcFile = `C374189autotestFile${getRandomPostfix()}.mrc`;
    const nameForCSVFile = `C374189autotestFile${getRandomPostfix()}.csv`;
    const nameForPreUpdatedMarcBibFile = 'C374189MarcBibPreUpdated.mrc';
    const mappingProfile = {
      name: 'Update MARC Bib records by matching 999 ff $s subfield value',
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      update: true,
      permanentLocation: `"${LOCATION_NAMES.ANNEX}"`,
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      name: 'Update MARC Bib records by matching 999 ff $s subfield value',
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
    };
    const matchProfile = {
      profileName: 'Update MARC Bib records by matching 999 ff $s subfield value',
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
      profileName: 'Update MARC Bib records by matching 999 ff $s subfield value',
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };
    const marcFiles = [
      {
        marc: 'marcBibFileForC374189.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        numOfRecords: 1,
      },
      {
        marc: 'marcAuthFileForC374189.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create SRS MARC Authority',
        numOfRecords: 1,
      },
    ];
    const linkingTagAndValues = [
      {
        rowIndex: 17,
        value: 'C374189 Chin, Staceyann, 1972-',
        tag: 100,
      },
      {
        rowIndex: 28,
        value: 'C374189 Chin, Staceyann, 1972-',
        tag: 600,
      },
    ];
    const createdAuthorityIDs = [];

    before('Creating user and test data', () => {
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
              cy.visit(TopMenu.dataImportPath);
              DataImport.verifyUploadState();
              DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
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
          })
          .then(() => {
            cy.visit(TopMenu.inventoryPath);
            InventoryInstance.searchByTitle(createdAuthorityIDs[0]);
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
      // clean up generated profiles
      JobProfiles.deleteJobProfile(jobProfile.profileName);
      MatchProfiles.deleteMatchProfile(matchProfile.profileName);
      ActionProfiles.deleteActionProfile(actionProfile.name);
      FieldMappingProfileView.deleteViaApi(mappingProfile.name);
      // delete created files in fixtures
      FileManager.deleteFile(`cypress/fixtures/${nameForExportedMarcFile}`);
      FileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
      FileManager.deleteFile(`cypress/fixtures/${nameForUpdatedMarcFile}`);
    });

    it(
      'C374189 Update tag value of linked "MARC Bib" field which is controlled by "MARC Authority" record (spitfire) (TaaS)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        InventoryInstance.searchByTitle(createdAuthorityIDs[0]);
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
        DataImport.uploadFileAndRetry(nameForUpdatedMarcFile, nameForUpdatedMarcFile);
        JobProfiles.waitLoadingList();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(nameForUpdatedMarcFile);
        Logs.checkStatusOfJobProfile('Completed');
        Logs.openFileDetails(nameForUpdatedMarcFile);

        cy.visit(TopMenu.inventoryPath);
        InventoryInstance.searchByTitle(testData.instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.checkAbsenceOfAuthorityIconInInstanceDetailPane('Contributor');
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.updated110Field);
        QuickMarcEditor.verifyTagFieldAfterLinking(...testData.updated600Field);
      },
    );
  });
});
