import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  EXISTING_RECORDS_NAMES,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
  DEFAULT_JOB_PROFILE_NAMES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
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
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    const testData = {
      tag110: '110',
      createdRecordIDs: [],
      marcValue: 'C374167 DiCaprio',
      markedValue: 'C374167 DiCaprio, Leonardo',
      searchOption: 'Keyword',
      csvFile: `exportedCSVFile${getRandomPostfix()}.csv`,
      exportedMarcFile: `exportedMarcFile${getRandomPostfix()}.mrc`,
      marcFileForModify: 'marcBibFileForC374167_1.mrc',
      modifiedMarcFile: `C374167 editedMarcFile${getRandomPostfix()}.mrc`,
      uploadModifiedMarcFile: `C374167 testMarcFile${getRandomPostfix()}.mrc`,
      updated700Field: [
        65,
        '700',
        '1',
        '\\',
        '$a C374167 DiCaprio, Leonardo $e actor. $0 http://id.loc.gov/authorities/names/n94000330',
      ],
    };
    const mappingProfile = {
      name: `C374167 Update MARC authority records by matching 999 ff $s subfield value ${getRandomPostfix()}`,
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.MARCAUTHORITY,
      name: `C374167 Update MARC authority records by matching 999 ff $s subfield value ${getRandomPostfix()}`,
      action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
    };
    const matchProfile = {
      profileName: `C374167 Update MARC authority records by matching 999 ff $s subfield value ${getRandomPostfix()}`,
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
      recordType: EXISTING_RECORDS_NAMES.MARC_AUTHORITY,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C374167 Update MARC authority records by matching 999 ff $s subfield value ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };
    const marcFiles = [
      {
        marc: 'marcBibFileForC374167.mrc',
        fileName: `C374167 testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        numOfRecords: 2,
        propertyName: 'instance',
      },
      {
        marc: 'marcAuthFileForC374167.mrc',
        fileName: `C374167 testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        numOfRecords: 1,
        authorityHeading: 'C374167 DiCaprio, Leonardo',
        propertyName: 'authority',
      },
    ];
    const linkingTagForFirstMarcBib = [
      {
        rowIndex: 65,
        value: '374167 DiCaprio',
        tag: 700,
      },
    ];

    const linkingTagForSecondMarcBib = [{ rowIndex: 22, value: '374167 DiCaprio', tag: 700 }];
    const twoMarcBibsToLink = [
      {
        marcBibRecord: 'C374167 Titanic / written and directed by James Cameron.',
        linkingFields: linkingTagForFirstMarcBib,
      },
      {
        marcBibRecord:
          'C374167 Aviator / Leonardo DiCaprio, Matt Damon, Jack Nicholson, Robert De Niro, Ray Liotta, Martin Scorsese, Barbara De Fina, Brad Grey, Alan Mak, Felix Chong, Nicholas Pileggi, William Monahan.',
        linkingFields: linkingTagForSecondMarcBib,
      },
    ];

    before('Create test data and login', () => {
      cy.getAdminToken();
      // make sure there are no duplicate authority records in the system
      MarcAuthorities.getMarcAuthoritiesViaApi({ limit: 100, query: 'keyword="C374167"' }).then(
        (records) => {
          records.forEach((record) => {
            if (record.authRefType === 'Authorized') {
              MarcAuthority.deleteViaAPI(record.id);
            }
          });
        },
      );
      cy.loginAsAdmin()
        .then(() => {
          // create Match profile
          NewMatchProfile.createMatchProfileViaApiMarc(matchProfile);

          // create Field mapping profile
          NewFieldMappingProfile.createMappingProfileForUpdateMarcAuthViaApi(mappingProfile);

          // create Action profile and link it to Field mapping profile
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(actionProfile, mappingProfile.name);

          // create Job profile
          cy.visit(SettingsMenu.jobProfilePath);
          JobProfiles.openNewJobProfileForm();
          NewJobProfile.fillJobProfile(jobProfile);
          NewJobProfile.linkMatchProfile(matchProfile.profileName);
          NewJobProfile.linkActionProfileForMatches(actionProfile.name);
          // wait for the action profile to be linked
          cy.wait(1000);
          NewJobProfile.saveAndClose();

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
        })
        .then(() => {
          cy.visit(TopMenu.inventoryPath);
          InventoryInstances.waitContentLoading();
          twoMarcBibsToLink.forEach((marcBib) => {
            InventoryInstances.searchByTitle(marcBib.marcBibRecord);
            cy.wait(1500);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            marcBib.linkingFields.forEach((linking) => {
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
          });
        });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.dataExportEnableApp.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
        MarcAuthoritiesSearch.searchBy(testData.searchOption, testData.marcValue);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
        InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[1]);
      });
      FileManager.deleteFolder(Cypress.config('downloadsFolder'));
      FileManager.deleteFile(`cypress/fixtures/${testData.modifiedMarcFile}`);
      FileManager.deleteFile(`cypress/fixtures/${testData.exportedMarcFile}`);
      FileManager.deleteFile(`cypress/fixtures/${testData.csvFile}`);
    });

    it(
      'C374167 Update "1XX" tag value of linked "MARC Authority" record which controls 2 "MARC Bib" records (spitfire)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        cy.wait(1000);
        MarcAuthorities.selectAllRecords();
        MarcAuthorities.verifyTextOfPaneHeaderMarcAuthority('1 record selected');
        MarcAuthorities.exportSelected();
        cy.wait(1000);
        MarcAuthorities.checkCallout(
          "is complete. The .csv downloaded contains selected records' UIIDs. To retrieve the .mrc file, please go to the Data export app.",
        );
        ExportFile.downloadCSVFile(testData.csvFile, 'QuickAuthorityExport*');
        MarcAuthorities.verifyAllCheckboxesAreUnchecked();
        MarcAuthorities.verifyTextOfPaneHeaderMarcAuthority('1 record found');

        cy.visit(TopMenu.dataExportPath);
        ExportFile.uploadFile(testData.csvFile);
        ExportFile.exportWithDefaultJobProfile(testData.csvFile, 'authority', 'Authorities');
        ExportFile.downloadExportedMarcFile(testData.exportedMarcFile);

        // change exported file
        DataImport.replace999SubfieldsInPreupdatedFile(
          testData.exportedMarcFile,
          testData.marcFileForModify,
          testData.modifiedMarcFile,
        );
        cy.visit(TopMenu.dataImportPath);
        DataImport.uploadFile(testData.modifiedMarcFile, testData.uploadModifiedMarcFile);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(testData.uploadModifiedMarcFile);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(testData.uploadModifiedMarcFile);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.authority,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
        });

        cy.visit(TopMenu.marcAuthorities);
        MarcAuthoritiesSearch.searchBy(testData.searchOption, testData.marcValue);
        MarcAuthorities.verifyEmptyNumberOfTitles();
        MarcAuthorities.selectTitle(marcFiles[1].authorityHeading);
        MarcAuthorities.checkRecordDetailPageMarkedValue(testData.markedValue);
        MarcAuthority.contains(testData.tag110);

        cy.visit(TopMenu.inventoryPath);
        InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.checkInstanceTitle(twoMarcBibsToLink[0].marcBibRecord);
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.checkEditableQuickMarcFormIsOpened();
        QuickMarcEditor.verifyIconsAfterUnlinking(65);
        QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.updated700Field);
        QuickMarcEditor.closeEditorPane();
        InventoryInstances.searchByTitle(testData.createdRecordIDs[1]);
        InventoryInstances.selectInstance();
        InventoryInstance.checkInstanceTitle(twoMarcBibsToLink[1].marcBibRecord);
        InventoryInstance.viewSource();
        InventoryInstance.checkAbsenceOfAuthorityIconInMarcViewPane();
        InventoryViewSource.notContains('$9');
      },
    );
  });
});
