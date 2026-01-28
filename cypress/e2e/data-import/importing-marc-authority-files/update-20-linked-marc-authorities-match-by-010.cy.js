import {
  EXISTING_RECORD_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
  DEFAULT_JOB_PROFILE_NAMES,
  APPLICATION_NAMES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
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
  describe('Importing MARC Authority files', () => {
    const testData = {
      createdRecordIDs: [],
      searchValue: 'C624340',
      searchValueUpdated: 'C624340 Black Panther A UPDATED by 010 match (Fictitious character)',
      searchOption: 'Keyword',
      csvFile: `C624340 exportedCSVFile${getRandomPostfix()}.csv`,
      exportedMarcFile: `C624340 exportedMarcAuthFile${getRandomPostfix()}.mrc`,
      modifiedMarcFile: 'marcAuthFileForC624340_preupdated.mrc',
      uploadModifiedMarcFile: `C624340 testMarcAuthFile${getRandomPostfix()}.mrc`,
      updated600Field: [
        46,
        '600',
        '0',
        '0',
        '$a C624340 Black Panther A UPDATED by 010 match $c (Fictitious character)',
        '',
        '$0 http://id.loc.gov/authorities/names/n2062434002',
        '',
      ],
      instanceTitle:
        "C624340 Black Panther / writer, Ta-Nehisi Coates ; artist, Brian Stelfreeze ; pencils/layouts, Chris Sprouse ; color artist, Laura Martin ; letterer, VC's Joe Sabino.",
      calloutMessage:
        "is complete. The .csv downloaded contains selected records' UIIDs. To retrieve the .mrc file, please go to the Data export app.",
      postfixForLinkedFields: 'UPDATED by 010 match',
    };
    const mappingProfile = {
      name: `AT_C624340_MappingProfile Update MARC authority records by matching 010 $a subfield value ${getRandomPostfix()}`,
    };
    const actionProfile = {
      name: `AT_C624340_ActionProfile Update MARC authority records by matching 010 $a subfield value ${getRandomPostfix()}`,
      action: 'UPDATE',
      folioRecordType: 'MARC_AUTHORITY',
    };
    const matchProfile = {
      profileName: `AT_C624340_MatchProfile Update MARC authority records by matching 010 $a subfield value ${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '010',
        in1: '',
        in2: '',
        subfield: 'a',
      },
      existingRecordFields: {
        field: '010',
        in1: '',
        in2: '',
        subfield: 'a',
      },
      recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const jobProfile = {
      profileName: `AT_C624340_JobProfie Update MARC authority records by matching 010 $a subfield value ${getRandomPostfix()}`,
    };
    const marcFiles = [
      {
        marc: 'marcBibFileForC624340.mrc',
        fileName: `C624340 testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        propertyName: 'instance',
      },
      {
        marc: 'marcAuthFileForC624340.mrc',
        fileName: `C624340 testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        propertyName: 'authority',
      },
    ];
    const linkingTagAndValues = [
      {
        tag: '100',
        rowIndex: 33,
        value: 'C624340 Coates, Ta-Nehisi',
        uuidIndex: '01',
        remainsLinked: true,
      },
      {
        tag: '600',
        rowIndex: 46,
        value: 'C624340 Black Panther A',
        uuidIndex: '02',
        remainsLinked: true,
      },
      {
        tag: '650',
        rowIndex: 47,
        value: 'C624340 Kings and rulers',
        uuidIndex: '03',
        remainsLinked: true,
      },
      {
        tag: '650',
        rowIndex: 49,
        value: 'C624340 Insurgency',
        uuidIndex: '04',
        remainsLinked: true,
      },
      {
        tag: '650',
        rowIndex: 50,
        value: 'C624340 Good and evil',
        uuidIndex: '05',
        remainsLinked: true,
      },
      {
        tag: '650',
        rowIndex: 51,
        value: 'C624340 Black people',
        uuidIndex: '06',
        remainsLinked: true,
      },
      {
        tag: '650',
        rowIndex: 64,
        value: 'C624340 Graphic novels',
        uuidIndex: '07',
        remainsLinked: true,
      },
      { tag: '651', rowIndex: 52, value: 'C624340 Africa', uuidIndex: '08', remainsLinked: false },
      {
        tag: '655',
        rowIndex: 67,
        value: 'C624340 Comics (Graphic works)',
        uuidIndex: '09',
        remainsLinked: false,
      },
      {
        tag: '655',
        rowIndex: 66,
        value: 'C624340 Superhero comics',
        uuidIndex: '10',
        remainsLinked: false,
      },
      {
        tag: '655',
        rowIndex: 71,
        value: 'C624340 Comics (Graphic works)',
        uuidIndex: '09',
        remainsLinked: false,
      },
      {
        tag: '700',
        rowIndex: 74,
        value: 'C624340 Stelfreeze, Brian',
        uuidIndex: '11',
        remainsLinked: true,
      },
      {
        tag: '700',
        rowIndex: 76,
        value: 'C624340 Martin, Laura',
        uuidIndex: '12',
        remainsLinked: true,
      },
      {
        tag: '700',
        rowIndex: 75,
        value: 'C624340 Sprouse, Chris',
        uuidIndex: '13',
        remainsLinked: false,
      },
      {
        tag: '700',
        rowIndex: 77,
        value: 'C624340 Sabino, Joe',
        uuidIndex: '14',
        remainsLinked: true,
      },
      {
        tag: '700',
        rowIndex: 79,
        value: 'C624340 Kirby, Jack',
        uuidIndex: '15',
        remainsLinked: false,
      },
      {
        tag: '700',
        rowIndex: 80,
        value: 'C624340 Acuña, Daniel,',
        uuidIndex: '16',
        remainsLinked: false,
      },
      {
        tag: '700',
        rowIndex: 81,
        value: 'C624340 Neilson, Donald,',
        uuidIndex: '17',
        remainsLinked: false,
      },
      {
        tag: '710',
        rowIndex: 82,
        value: 'C624340 Black Panther Movement',
        uuidIndex: '18',
        remainsLinked: false,
      },
      {
        tag: '711',
        rowIndex: 83,
        value: 'C624340 Panther Photographic International',
        uuidIndex: '19',
        remainsLinked: false,
      },
      {
        tag: '830',
        rowIndex: 84,
        value: 'C624340 Black Panther, Wakanda forever (Motion picture)',
        uuidIndex: '20',
        remainsLinked: false,
      },
    ];

    before('Create test data and login', () => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(testData.searchValue);

      // create Field mapping profile
      NewFieldMappingProfile.createMappingProfileForUpdateMarcAuthViaApi(mappingProfile)
        .then((mappingProfileResponse) => {
          mappingProfile.id = mappingProfileResponse.body.id;
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
          // create Match profile
          NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(matchProfile).then(
            (matchProfileResponse) => {
              matchProfile.id = matchProfileResponse.body.id;
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

      cy.then(() => {
        marcFiles.forEach((marcFile) => {
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              testData.createdRecordIDs.push(record[marcFile.propertyName].id);
            });
          });
        });
      }).then(() => {
        cy.loginAsAdmin({
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        linkingTagAndValues.forEach((linkingTagAndValue) => {
          InventoryInstance.verifyAndClickLinkIconByIndex(linkingTagAndValue.rowIndex);
          InventoryInstance.verifySelectMarcAuthorityModal();
          MarcAuthorities.switchToSearch();
          InventoryInstance.searchResults(linkingTagAndValue.value);
          InventoryInstance.clickLinkButton();
          QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
            linkingTagAndValue.tag,
            linkingTagAndValue.rowIndex,
          );
          cy.wait(200);
        });
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();
        cy.wait(4000);

        cy.getAdminToken();
        cy.createTempUser([
          Permissions.moduleDataImportEnabled.gui,
          Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });

          MarcAuthorities.waitLoading();
          MarcAuthorities.verifyDisabledSearchButton();
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
      testData.createdRecordIDs.forEach((id, index) => {
        if (index) MarcAuthority.deleteViaAPI(id);
      });
      FileManager.deleteFolder(Cypress.config('downloadsFolder'));
      FileManager.deleteFile(`cypress/fixtures/${testData.exportedMarcFile}`);
      FileManager.deleteFile(`cypress/fixtures/${testData.csvFile}`);
    });

    it(
      'C624340 Update 20 linked MARC authority records which are linked to the same MARC bibliographic record using 010 $a for match (10 links are retained, 11 links are deleted) (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C624340'] },
      () => {
        MarcAuthoritiesSearch.searchBy(testData.searchOption, testData.searchValue);
        cy.wait(1000);
        MarcAuthorities.selectAllRecords();
        MarcAuthorities.verifyTextOfPaneHeaderMarcAuthority('20 records selected');
        MarcAuthorities.exportSelected();
        cy.wait(1000);
        MarcAuthorities.checkCallout(testData.calloutMessage);
        ExportFile.downloadCSVFile(testData.csvFile, 'QuickAuthorityExport*');
        MarcAuthorities.verifyAllCheckboxesAreUnchecked();
        MarcAuthorities.verifyTextOfPaneHeaderMarcAuthority('20 records found');

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
        ExportFile.uploadFile(testData.csvFile);
        ExportFile.exportWithDefaultJobProfile(
          testData.csvFile,
          'Default authority',
          'Authorities',
        );
        ExportFile.downloadExportedMarcFile(testData.exportedMarcFile);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.uploadFileAndRetry(testData.modifiedMarcFile, testData.uploadModifiedMarcFile);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(testData.uploadModifiedMarcFile);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        cy.wait(5000); // wait for file details to be loaded
        Logs.openFileDetails(testData.uploadModifiedMarcFile);
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.UPDATED,
          FileDetails.columnNameInResultList.authority,
        );
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.UPDATED,
          FileDetails.columnNameInResultList.srsMarc,
        );

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
        MarcAuthorities.waitLoading();
        MarcAuthoritiesSearch.searchBy(testData.searchOption, testData.searchValueUpdated);
        MarcAuthorities.verifyNumberOfTitles(5, '1');
        MarcAuthorities.clickNumberOfTitlesByHeading(testData.searchValueUpdated);
        InventoryInstance.waitInstanceRecordViewOpened(testData.instanceTitle);
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.checkEditableQuickMarcFormIsOpened();
        QuickMarcEditor.verifyTagFieldAfterLinking(...testData.updated600Field);
        linkingTagAndValues.forEach((linkingTagAndValue) => {
          if (linkingTagAndValue.remainsLinked) {
            QuickMarcEditor.verifyRowLinked(linkingTagAndValue.rowIndex);
            QuickMarcEditor.checkLinkedFieldContainsControlledValueByIndex(
              linkingTagAndValue.rowIndex,
              `$a ${linkingTagAndValue.value} ${testData.postfixForLinkedFields}`,
              linkingTagAndValue.tag,
            );
          } else {
            QuickMarcEditor.verifyRowLinked(linkingTagAndValue.rowIndex, false);
            QuickMarcEditor.checkFieldContainsValueByIndex(
              linkingTagAndValue.rowIndex,
              `$a ${linkingTagAndValue.value} $`,
              linkingTagAndValue.tag,
            );
          }
          cy.wait(500);
        });
      },
    );
  });
});
