import {
  EXISTING_RECORD_NAMES,
  RECORD_STATUSES,
  DEFAULT_JOB_PROFILE_NAMES,
  APPLICATION_NAMES,
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
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';

import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {};
    // unique file name to upload
    const nameForUpdatedMarcFile = `C385665autotestFile${getRandomPostfix()}.mrc`;
    const nameForExportedMarcFile = `C385665autotestFile${getRandomPostfix()}.mrc`;
    const nameForCSVFile = `C385665autotestFile${getRandomPostfix()}.csv`;
    const mappingProfile = {
      name: `C385665 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
    };
    const actionProfile = {
      name: `C385665 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
      action: 'UPDATE',
      folioRecordType: 'MARC_BIBLIOGRAPHIC',
    };
    const matchProfile = {
      profileName: `C385665 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
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
      profileName: `C385665 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
    };
    const marcFiles = [
      {
        marc: 'marcBibFileForC385665.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        numOfRecords: 1,
        propertyName: 'instance',
      },
      {
        marc: 'marcAuthFileC385665_1.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        numOfRecords: 1,
        propertyName: 'authority',
      },
      {
        marc: 'marcAuthFileC385665_2.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        numOfRecords: 1,
        propertyName: 'authority',
      },
      {
        marc: 'marcAuthFileC385665_3.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        numOfRecords: 1,
        propertyName: 'authority',
      },
    ];
    const linkingTagAndValues = [
      {
        rowIndex: 74,
        value: 'C385665Chin, Staceyann',
      },
      {
        rowIndex: 75,
        value: 'C385665Lee, Stan, 1922-2018',
      },
      {
        rowIndex: 76,
        value: 'C385665Kirby, Jack',
      },
    ];
    const createdAuthorityIDs = [];
    const subfield = '$9';

    before('Creating user', () => {
      cy.getAdminToken();
      // make sure there are no duplicate authority records in the system
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C385665');

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
      ])
        .then((createdUserProperties) => {
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
              NewFieldMappingProfile.createMappingProfileForUpdateMarcBibViaApi(
                mappingProfile,
              ).then((mappingProfileResponse) => {
                mappingProfile.id = mappingProfileResponse.body.id;
              });
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
        })
        .then(() => {
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
    });

    after('delete test data', () => {
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
      'C385665 Update controllable subfield, "$0" in one of the linked repeatable fields (multiple repeatable fields with same indicators) (spitfire)',
      { tags: ['criticalPathFlaky', 'spitfire', 'C385665'] },
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
          InventoryInstance.closeDetailsView();
          InventoryInstance.closeFindAuthorityModal();
          // waiter needed for the fileds to be linked.
          cy.wait(1000);
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
          ['aC385665Kirby, Jack', 'n77020008'],
          ['aC385665Kirby, Steve,', 'n77020008test'],
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
        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.verifyTagFieldAfterLinking(
          74,
          '700',
          '1',
          '\\',
          '$a C385665Chin, Staceyann',
          '$e letterer.',
          '$0 http://id.loc.gov/authorities/names/n2008052404',
          '',
        );
        QuickMarcEditor.verifyTagFieldAfterLinking(
          75,
          '700',
          '1',
          '\\',
          '$a C385665Lee, Stan, $d 1922-2018',
          '$e creator',
          '$0 http://id.loc.gov/authorities/names/n83169267',
          '',
        );
        QuickMarcEditor.verifyTagFieldAfterUnlinking(
          76,
          '700',
          '1',
          '\\',
          '$a C385665Kirby, Steve, $e creator. $0 http://id.loc.gov/authorities/names/n77020008test',
        );

        QuickMarcEditor.closeEditorPane();
        InventoryInstance.viewSource();
        InventoryViewSource.verifyLinkedToAuthorityIcon(linkingTagAndValues[0].rowIndex);
        InventoryViewSource.verifyExistanceOfValueInRow(subfield, linkingTagAndValues[0].rowIndex);
        InventoryViewSource.verifyLinkedToAuthorityIcon(linkingTagAndValues[1].rowIndex);
        InventoryViewSource.verifyExistanceOfValueInRow(subfield, linkingTagAndValues[1].rowIndex);
        InventoryViewSource.verifyLinkedToAuthorityIcon(linkingTagAndValues[2].rowIndex, false);
        InventoryViewSource.verifyAbsenceOfValueInRow(subfield, linkingTagAndValues[2].rowIndex);
      },
    );
  });
});
