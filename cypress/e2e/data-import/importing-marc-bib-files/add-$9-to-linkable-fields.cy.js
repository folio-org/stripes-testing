import {
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
  FOLIO_RECORD_TYPE,
  LOCATION_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import {
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../support/fragments/settings/dataImport';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {
      the130Field: [8, '130', '1', '\\', '$a De Berquelle, Raymond $d 1933-'],
      the240Field: [9, '240', '\\', '\\', '$a The value'],
      the800Field: [15, '800', '\\', '\\', '$a Series'],
      the811Field: [16, '811', '\\', '0', '$a Wangaratta, Victoria, 1994.'],
      the245Field: [10, '245', '1', '0', '$a Welcome home Olympians Added subfields 9'],
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
            'ffs6b5e5b5d-c2ba-4227-95a0-121c2403c7a3idb80d295-ade4-4934-a559-94706202e60c',
            field999data,
          );
          content[0] = firstString;
          FileManager.createFile(`cypress/fixtures/${finalFileName}`, content.join('\n'));
        });
      });
    }
    // unique file name to upload
    const nameForUpdatedMarcFile = `C380499autotestFile${getRandomPostfix()}.mrc`;
    const nameForExportedMarcFile = `C380499autotestFile${getRandomPostfix()}.mrc`;
    const nameForCSVFile = `C380499autotestFile${getRandomPostfix()}.csv`;
    const nameForPreUpdatedMarcBibFile = 'C380499MarcBibPreUpdated.mrc';
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
        marc: 'marcBibFileForC380499.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        numOfRecords: 1,
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
        Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
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
      'C380499 Add "$9" to the linkable fields when updating "MARC Bib" record (spitfire) (TaaS)',
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
        DataImport.uploadFileAndRetry(nameForUpdatedMarcFile, nameForUpdatedMarcFile);
        JobProfiles.waitLoadingList();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(nameForUpdatedMarcFile);
        Logs.checkStatusOfJobProfile('Completed');
        Logs.openFileDetails(nameForUpdatedMarcFile);
        Logs.verifyInstanceStatus(0, 3, RECORD_STATUSES.UPDATED);

        cy.visit(TopMenu.inventoryPath);
        InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.the130Field);
        QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.the240Field);
        QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.the800Field);
        QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.the811Field);
        QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.the245Field);
        QuickMarcEditor.closeEditorPane();

        InventoryInstance.viewSource();
        InventoryViewSource.contains('\t130\t1  \t$a De Berquelle, Raymond $d 1933-');
        InventoryViewSource.contains('\t240\t   \t$a The value');
        InventoryViewSource.contains('\t800\t   \t$a Series');
        InventoryViewSource.contains('\t811\t  0\t$a Wangaratta, Victoria, 1994.');
        InventoryViewSource.contains('\t245\t1 0\t$a Welcome home Olympians Added subfields 9');
        InventoryViewSource.close();
        InventoryInstance.deriveNewMarcBib();
        QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.the130Field);
        QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.the240Field);
        QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.the800Field);
        QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.the811Field);
        QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.the245Field);
      },
    );
  });
});
