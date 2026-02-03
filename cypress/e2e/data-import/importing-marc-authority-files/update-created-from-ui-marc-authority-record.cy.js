import {
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORD_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
  DEFAULT_FOLIO_AUTHORITY_FILES,
  APPLICATION_NAMES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import ActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/actionProfiles';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import Logs from '../../../support/fragments/data_import/logs/logs';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import ManageAuthorityFiles from '../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import FileManager from '../../../support/utils/fileManager';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    const searchOption = 'Keyword';
    const searchValue = 'aat42356411';
    const recordTitle = 'C423564 John Doe Sir, 1909-1965';
    const headerText = /Create a new .*MARC authority record/;
    const dropdownSelections = {
      'Geo Subd': 'a',
      Roman: 'a',
      Lang: 'b',
      'Kind rec': 'a',
      'Cat Rules': 'b',
      'SH Sys': 'a',
      Series: 'b',
      'Numb Series': 'a',
      'Main use': 'a',
      'Subj use': 'a',
      'Series use': 'a',
      'Type Subd': 'a',
      'Govt Ag': 'a',
      RefEval: 'a',
      RecUpd: 'a',
      'Pers Name': 'b',
      'Level Est': 'a',
      'Mod Rec': 'a',
      Source: 'a',
    };
    const newFields = [
      { previousFieldTag: '008', tag: '010', content: '$a aat42356411' },
      {
        previousFieldTag: '010',
        tag: '035',
        content: '$a 794564',
      },
      {
        previousFieldTag: '035',
        tag: '100',
        content: '$a C423564 John Doe $c Sir, $d 1909-1965 $l eng',
      },
      {
        previousFieldTag: '100',
        tag: '400',
        content: '$a Huan Doe $c Senior, $d 1909-1965 $l eng',
      },
      {
        previousFieldTag: '400',
        tag: '500',
        content: '$a La familia',
      },
    ];
    const calloutMessage =
      "is complete. The .csv downloaded contains selected records' UIIDs. To retrieve the .mrc file, please go to the Data export app.";
    const csvFile = `C423564 exportedCSVFile${getRandomPostfix()}.csv`;
    const exportedMarcFile = `C423564 exportedMarcFile${getRandomPostfix()}.mrc`;
    const modifiedMarcFile = 'C423564 modifiedMarcFile.mrc';
    const uploadModifiedMarcFile = `C423564 uploadModifiedMarcFile${getRandomPostfix()}.mrc`;
    const mappingProfile = {
      name: `C423564 Update MARC authority by matching of '010 $a' subfield value (with Create action for non-matches) ${getRandomPostfix()}`,
    };
    const actionProfile = {
      folioRecordType: 'MARC_AUTHORITY',
      name: `C423564 Update MARC authority by matching of 010 $a subfield value (with Create action for non-matches) ${getRandomPostfix()}`,
      action: 'UPDATE',
    };
    const matchProfile = {
      profileName: `C423564 Update MARC authority by matching of 010 $a subfield value (with Create action for non-matches) ${getRandomPostfix()}`,
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
      ...NewJobProfile.defaultJobProfile,
      profileName: `C423564 Update MARC authority by matching of 010 $a subfield value (with Create action for non-matches) ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };
    let createdAuthorityId;
    let user;

    before('Create test data and login', () => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C423564*');

      // get default Action profile
      ActionProfile.getActionProfilesViaApi({
        query: 'name="Default - Create MARC Authority"',
      }).then(({ actionProfiles }) => {
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
            NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(
              matchProfile,
            ).then((matchProfileResponse) => {
              matchProfile.id = matchProfileResponse.body.id;
            });
          })
          .then(() => {
            // create Job profile
            NewJobProfile.createJobProfileWithLinkedMatchAndActionProfileAndNonMatchActionProfileViaApi(
              jobProfile.profileName,
              matchProfile.id,
              actionProfile.id,
              actionProfiles[0].id,
            ).then((id) => {
              jobProfile.id = id;
            });
          });
      });
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        Permissions.dataExportViewAddUpdateProfiles.gui,
      ]).then((userProperties) => {
        user = userProperties;

        ManageAuthorityFiles.setAuthorityFileToActiveViaApi(
          DEFAULT_FOLIO_AUTHORITY_FILES.ART_AND_ARCHITECTURE_THESAURUS,
        );

        cy.login(user.username, user.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
          authRefresh: true,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(
        DEFAULT_FOLIO_AUTHORITY_FILES.ART_AND_ARCHITECTURE_THESAURUS,
      );
      SettingsJobProfiles.deleteJobProfileViaApi(jobProfile.id);
      SettingsMatchProfiles.deleteMatchProfileViaApi(matchProfile.id);
      SettingsActionProfiles.deleteActionProfileViaApi(actionProfile.id);
      SettingsFieldMappingProfiles.deleteMappingProfileViaApi(mappingProfile.id);
      Users.deleteViaApi(user.userId);
      MarcAuthority.deleteViaAPI(createdAuthorityId, true);
      FileManager.deleteFolder(Cypress.config('downloadsFolder'));
      FileManager.deleteFile(`cypress/fixtures/${exportedMarcFile}`);
      FileManager.deleteFile(`cypress/fixtures/${csvFile}`);
    });

    it(
      'C423564 C423563 Update of created from UI MARC authority record (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C423564', 'C423563'] },
      () => {
        // Click on "Actions" button in second pane >> Select "+ New" option
        MarcAuthorities.clickActionsAndNewAuthorityButton();
        QuickMarcEditor.checkPaneheaderContains(headerText);
        MarcAuthority.checkSourceFileSelectShown();

        MarcAuthority.selectSourceFile(
          DEFAULT_FOLIO_AUTHORITY_FILES.ART_AND_ARCHITECTURE_THESAURUS,
        );
        MarcAuthority.select008DropdownsIfOptionsExist(dropdownSelections);
        // Add 5 new fields by clicking on "+" icon and fill it
        newFields.forEach((newField) => {
          MarcAuthority.addNewFieldAfterExistingByTag(
            newField.previousFieldTag,
            newField.tag,
            newField.content,
          );
          cy.wait(500);
        });
        newFields.forEach((newField) => {
          QuickMarcEditor.checkContentByTag(newField.tag, newField.content);
        });

        // Click on the "Save & close" button
        QuickMarcEditor.pressSaveAndClose();
        MarcAuthority.verifyAfterSaveAndClose();
        QuickMarcEditor.verifyPaneheaderWithContentAbsent(headerText);
        MarcAuthorities.verifyViewPaneContentExists();
        MarcAuthority.getId().then((id) => {
          createdAuthorityId = id;
        });
        newFields.forEach((newField) => {
          MarcAuthority.contains(newField.content);
        });

        // Close the detail view pane by clicking on "X" icon placed in the left upper corner of the pain
        MarcAuthorities.closeMarcViewPane();
        MarcAuthorities.verifyMarcViewPaneIsOpened(false);

        // Find created record by value from "010" field
        MarcAuthorities.searchBy(searchOption, searchValue);
        MarcAuthorities.checkAfterSearch('Authorized', recordTitle);

        // Check the checkbox placed to the left of "Authorized/Reference" column next to created record
        MarcAuthorities.checkSelectAuthorityRecordCheckbox(recordTitle);
        MarcAuthorities.checkSelectAuthorityRecordCheckboxChecked(recordTitle);
        MarcAuthorities.verifyTextOfPaneHeaderMarcAuthority('1 record selected');

        // Click on "Actions" button in second pane → Select "Export selected records (CSV/MARC)" option
        MarcAuthorities.exportSelected();
        cy.wait(1000);
        MarcAuthorities.checkCallout(calloutMessage);
        ExportFile.downloadCSVFile(csvFile, 'QuickAuthorityExport*');
        MarcAuthorities.checkSelectAuthorityRecordCheckboxChecked(recordTitle, false);
        MarcAuthorities.verifyTextOfPaneHeaderMarcAuthorityAbsent('1 record selected');

        // Go to "Data export" app and download exported ".mrc" file
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
        ExportFile.uploadFile(csvFile);
        ExportFile.exportWithDefaultJobProfile(csvFile, 'Default authority', 'Authorities');
        ExportFile.downloadExportedMarcFile(exportedMarcFile);
        ExportFile.verifyFileIncludes(exportedMarcFile, [
          'aat42356411',
          '794564',
          'C423564 John Doe',
          'Sir,',
          '1909-1965',
          'eng',
          'Huan Doe',
          'Senior,',
          '1909-1965',
          'La familia',
        ]);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.uploadFile(modifiedMarcFile, uploadModifiedMarcFile);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(uploadModifiedMarcFile);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(uploadModifiedMarcFile);
        Logs.verifyInstanceStatus(0, 6, RECORD_STATUSES.UPDATED);

        // Click on the "Updated" hyperlink under "Authority" column
        Logs.clickOnHotLink(0, 6, RECORD_STATUSES.UPDATED);
        cy.wait(2000);
        MarcAuthority.contains('$a C423564 John Doe Updated $c Sir, $d 1909-1965 $l eng');
        // remove the updated field from the array
        newFields.splice(2, 1);
        newFields.forEach((newField) => {
          MarcAuthority.contains(newField.content);
        });
      },
    );
  });
});
