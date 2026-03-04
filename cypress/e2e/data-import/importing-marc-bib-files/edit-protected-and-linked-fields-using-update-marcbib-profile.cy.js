import {
  APPLICATION_NAMES,
  EXISTING_RECORD_NAMES,
  RECORD_STATUSES,
  DEFAULT_JOB_PROFILE_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import Logs from '../../../support/fragments/data_import/logs/logs';
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
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {};
    let firstFieldId = null;
    let secondFieldId = null;
    let thirdFieldId = null;
    // unique file name to upload
    const nameForUpdatedMarcFile = `C380511autotestFile${getRandomPostfix()}.mrc`;
    const nameForExportedMarcFile = `C380511autotestFile${getRandomPostfix()}.mrc`;
    const nameForCSVFile = `C380511autotestFile${getRandomPostfix()}.csv`;
    const mappingProfile = {
      name: `C380511 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
    };
    const actionProfile = {
      name: `C380511 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
      action: 'UPDATE',
      folioRecordType: 'MARC_BIBLIOGRAPHIC',
    };
    const matchProfile = {
      profileName: `C380511 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
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
      profileName: `C380511 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
    };
    const protectedFields = {
      firstField: '100',
      secondField: '240',
      thirdField: '700',
    };
    const marcFiles = [
      {
        marc: 'marcBibFileForC380511.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        numOfRecords: 1,
        propertyName: 'instance',
      },
      {
        marc: 'marcFileForC380511.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        numOfRecords: 4,
        propertyName: 'authority',
      },
    ];
    const linkingTagAndValues = [
      {
        rowIndex: 16,
        value: 'C380511 Ludwig V, Beethoven, 1770-1827.',
        tag: '100',
      },
      {
        rowIndex: 17,
        value:
          'C380511 Beethoven, Ludwig van, 1770-1827 Variations, piano, violin, cello, op. 44, E♭ major',
        tag: '240',
      },
      {
        rowIndex: 40,
        value: 'C380511 Music piano',
        tag: '650',
      },
      {
        rowIndex: 49,
        value: 'C380511 Hewitt, Angela, 1958-',
        tag: '700',
      },
      {
        rowIndex: 50,
        value: 'C380511 Ludwig van, Beethoven, 1770-1827.',
        tag: '700',
      },
    ];
    const createdAuthorityIDs = [];

    before('Creating user', () => {
      cy.getAdminToken();
      // make sure there are no duplicate authority records in the system
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C380511');

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
          subfield: '0',
          data: '*',
          source: 'USER',
          field: protectedFields.secondField,
        }).then((resp) => {
          secondFieldId = resp.id;
        });
        MarcFieldProtection.createViaApi({
          indicator1: '*',
          indicator2: '*',
          subfield: '9',
          data: '*',
          source: 'USER',
          field: protectedFields.thirdField,
        }).then((resp) => {
          thirdFieldId = resp.id;
        });

        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
      createdAuthorityIDs.forEach((id, index) => {
        if (index) MarcAuthority.deleteViaAPI(id, true);
      });
      MarcFieldProtection.deleteViaApi(firstFieldId, true);
      MarcFieldProtection.deleteViaApi(secondFieldId, true);
      MarcFieldProtection.deleteViaApi(thirdFieldId, true);
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
      'C380511 Edit protected and linked fields using update MARC Bib profile (spitfire)',
      { tags: ['criticalPathFlaky', 'spitfire', 'C380511'] },
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
          [
            'aC380511 Ludwig van, Beethoven,d1770-1827ecomposer',
            '0id.loc.gov/authorities/names/n83130832',
            'aC380511 Music piano',
            'ewriter of supplementary textual content.',
            'aC380511 Ludwig van, Beethoven,d1770-1827iContainer of (work):0http://id.loc.gov/authorities/names/n79107741',
          ],
          [
            'aC380511 Beethoven, Ludwig V.d1770-1827eAuthor',
            '0id.loc.gov/authorities/names/n83130833',
            'aC380511 Music pianocTest environment',
            'eauthor of supplementary textual content.',
            'aC380511 Beethoven, Ludwig V.d1770-1827iContainer of (work):',
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
        Logs.clickOnHotLink(0, 3, RECORD_STATUSES.UPDATED);
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.verifyTagFieldAfterLinking(
          16,
          '100',
          '1',
          '\\',
          '$a C380511 Ludwig V, Beethoven, $d 1770-1827',
          '$e composer.',
          '$0 http://id.loc.gov/authorities/names/n79107741',
          '',
        );
        QuickMarcEditor.verifyTagFieldAfterLinking(
          17,
          '240',
          '1',
          '0',
          '$a Variations, $m piano, violin, cello, $n op. 44, $r E♭ major',
          '$c Ludwig Van Beethoven.',
          '$0 http://id.loc.gov/authorities/names/n83130832',
          '',
        );
        QuickMarcEditor.verifyTagFieldAfterLinking(
          40,
          '650',
          '\\',
          '0',
          '$a C380511 Music piano',
          '$c Test environment',
          '$0 http://id.loc.gov/authorities/childrensSubjects/sj2021056711',
          '',
        );
        QuickMarcEditor.verifyTagFieldAfterLinking(
          49,
          '700',
          '1',
          '\\',
          '$a C380511 Hewitt, Angela, $d 1958-',
          '$e instrumentalist, $e writer of supplementary textual content.',
          '$0 http://id.loc.gov/authorities/names/n91099716',
          '',
        );
        QuickMarcEditor.verifyTagFieldAfterLinking(
          51,
          '700',
          '1',
          '2',
          '$a C380511 Beethoven, Ludwig van, $d 1770-1827. $t Variations, $m piano, violin, cello, $n op. 44, $r E♭ major',
          '$i Container of (work):',
          '$0 http://id.loc.gov/authorities/names/n83130832',
          '',
        );
        QuickMarcEditor.verifyTagFieldAfterUnlinking(
          50,
          '700',
          '1',
          '\\',
          '$a C380511 Hewitt, Angela, $d 1958- $e instrumentalist, $e author of supplementary textual content. $0 http://id.loc.gov/authorities/names/n91099716',
        );
        QuickMarcEditor.verifyTagFieldAfterUnlinking(
          52,
          '700',
          '1',
          '2',
          '$a C380511 Beethoven, Ludwig van, $d 1770-1827. $t Variations, $m piano, violin, cello, $n op. 44, $r E♭ major $i Container of (work): $0 http://id.loc.gov/authorities/names/n83130832',
        );
      },
    );
  });
});
