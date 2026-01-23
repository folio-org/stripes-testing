import {
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  RECORD_STATUSES,
  DEFAULT_JOB_PROFILE_NAMES,
  APPLICATION_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import Logs from '../../../support/fragments/data_import/logs/logs';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {};
    // unique file name to upload
    const nameForUpdatedMarcFile = `C385673autotestFile${getRandomPostfix()}.mrc`;
    const nameForExportedMarcFile = `C385673autotestFile${getRandomPostfix()}.mrc`;
    const nameForCSVFile = `C385673autotestFile${getRandomPostfix()}.csv`;
    const mappingProfile = {
      name: `C385673 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
    };
    const actionProfile = {
      name: `C385673 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
      action: 'UPDATE',
      folioRecordType: 'MARC_BIBLIOGRAPHIC',
    };
    const matchProfile = {
      profileName: `C385673 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
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
      recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const jobProfile = {
      profileName: `C385673 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
    };
    const marcFiles = [
      {
        marc: 'marcBibFileForC385673.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        numOfRecords: 1,
        propertyName: 'instance',
      },
      {
        marc: 'marcFileForC385673.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        numOfRecords: 3,
        propertyName: 'authority',
      },
    ];
    const linkingTagAndValues = [
      {
        rowIndex: 32,
        value: 'C385673 Coates, Ta-Nehisi',
        tag: 100,
      },
      {
        rowIndex: 74,
        value: 'C385673 Chin, Staceyann',
        tag: 700,
      },
      {
        rowIndex: 77,
        value: 'C385673 Lee, Stan, 1922-2018',
        tag: 700,
      },
    ];
    const createdAuthorityIDs = [];

    before('Creating user', () => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C385673*');

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        Permissions.dataExportViewAddUpdateProfiles.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        // create Match profile
        NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(matchProfile)
          .then((matchProfileResponse) => {
            matchProfile.id = matchProfileResponse.body.id;
          })
          .then(() => {
            // create Field mapping profile
            NewFieldMappingProfile.createMappingProfileForUpdateMarcBibViaApi(mappingProfile).then(
              (mappingProfileResponse) => {
                mappingProfile.id = mappingProfileResponse.body.id;
              },
            );
          })
          .then(() => {
            // create Action profile and link it to Field mapping profile
            NewActionProfile.createActionProfileViaApi(actionProfile, mappingProfile.id).then(
              (actionProfileResponse) => {
                actionProfile.id = actionProfileResponse.body.id;
              },
            );
          })
          .then(() => {
            // create Job profile
            NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
              jobProfile.profileName,
              matchProfile.id,
              actionProfile.id,
            );
          });

        cy.getUserToken(testData.userProperties.username, testData.userProperties.password);
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

        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C385673');
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
      'C385673 Add controllable, non-controllable subfields to one of the linked repeatable (multiple repeatable fields with same indicators) and not repeatable fields (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C385673'] },
      () => {
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

        // download .csv file
        InventorySearchAndFilter.saveUUIDs();
        ExportFile.downloadCSVFile(nameForCSVFile, 'SearchInstanceUUIDs*');
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
        // download exported marc file
        ExportFile.uploadFile(nameForCSVFile);
        ExportFile.exportWithDefaultJobProfile(nameForCSVFile);
        ExportFile.downloadExportedMarcFile(nameForExportedMarcFile);
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));
        cy.log('#####End Of Export#####');

        DataImport.editMarcFile(
          nameForExportedMarcFile,
          nameForUpdatedMarcFile,
          ['aC385673 Coates, Ta-Nehisi', 'aC385673 Lee, Stan,'],
          [
            'aC385673 Coates, Ta-NehisiaNarrator9f01479eWriter',
            'aC385673 Lee, Stan,aAnother author9f01479eAUTHOR',
          ],
        );

        // upload the exported marc file with 999.f.f.s fields
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.waitLoading();
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(nameForUpdatedMarcFile, nameForUpdatedMarcFile);
        JobProfiles.waitLoadingList();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(nameForUpdatedMarcFile);
        Logs.checkJobStatus(nameForUpdatedMarcFile, 'Completed');
        Logs.openFileDetails(nameForUpdatedMarcFile);
        Logs.verifyInstanceStatus(0, 3, RECORD_STATUSES.UPDATED);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.verifyTagFieldAfterLinking(
          32,
          '100',
          '1',
          '\\',
          '$a C385673 Coates, Ta-Nehisi',
          '$e Writer $e author.',
          '$0 http://id.loc.gov/authorities/names/n2008001084',
          '',
        );
        QuickMarcEditor.verifyTagFieldAfterLinking(
          74,
          '700',
          '1',
          '\\',
          '$a C385673 Chin, Staceyann',
          '$e letterer.',
          '$0 http://id.loc.gov/authorities/names/n2008052404',
          '',
        );
        QuickMarcEditor.verifyTagFieldAfterLinking(
          75,
          '700',
          '1',
          '\\',
          '$a C385673 Lee, Stan, $d 1922-2018',
          '$e AUTHOR $e creator',
          '$0 http://id.loc.gov/authorities/names/n83169267',
          '',
        );

        QuickMarcEditor.closeEditorPane();
        // Wait for the content to be loaded.
        cy.wait(4000);
        InventoryInstance.viewSource();
        InventoryInstance.checkExistanceOfAuthorityIconInMarcViewPane();
        MarcAuthorities.checkFieldAndContentExistence('100', '$9');
        MarcAuthorities.checkFieldAndContentExistence('700', '$9');
      },
    );
  });
});
