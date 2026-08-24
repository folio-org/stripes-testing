import {
  ACCEPTED_DATA_TYPE_NAMES,
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  RECORD_STATUSES,
} from '../../../../support/constants';

import Permissions from '../../../../support/dictionary/permissions';
import FileManager from '../../../../support/utils/fileManager';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

import DataImport from '../../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../../support/fragments/data_import/logs/fileDetails';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import NewActionProfile from '../../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewFieldMappingProfile from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../../support/fragments/settings/dataImport';

const testData = {
  createdAuthorityID: null,
  createdBibID: null,
  userProperties: null,
  firstAuthFileName: 'marcAuthFileForC605928-1.mrc',
  firstAuthEditedFileName: `marcAuthFileForC605928-1.${getRandomPostfix()}.mrc`,
  firstAuthUpdatedFileName: `testMarcFileUpd.${getRandomPostfix()}.mrc`,
  secondAuthFileName: 'marcAuthFileForC605928-2.mrc',
  secondAuthEditedFileName: `marcAuthFileForC605928-2.${getRandomPostfix()}.mrc`,
  secondAuthUpdatedFileName: `testMarcFileUpd.${getRandomPostfix()}.mrc`,
  bibFileName: 'marcBibFileForC605928.mrc',
  bibEditedFileName: `marcBibFileForC605928.${getRandomPostfix()}mrc`,
  bibUpdatedFileName: `testMarcFileUpd.${getRandomPostfix()}.mrc`,
  jobStatusCompleted: 'Completed',
  keywordOption: 'Keyword',
  authorityAuthorized: 'Authorized',
  authorityHeadingType: 'Geographic Name',
  tag651: '651',
  tag151: '151',
  field651Index: 28,
  field651Ind1: '\\',
  field651Ind2: '0',
  field651Initial: '$a AT_C605928 United States of America $x History $e Country $b States $e USA $y Civil War, 1861-1865 $x Cavalry operations.',
  field651Uri: 'http://id.loc.gov/authorities/subjects/sh85140220605928',
  field651Uncontrolled2: '$8 number801 $1 URI1 $8 number802',
  updatedAuthTitle: 'AT_C605928 United States of America USA Independence war History Civil War, 1861-1865 Cavalry operations',
  updatedAuth151: '$a AT_C605928 United States of America $z USA $y Independence war $x History $y Civil War, 1861-1865 $x Cavalry operations',
  field651ControlledUpdated: '$a AT_C605928 United States of America $z USA $y Independence war $x History $y Civil War, 1861-1865 $x Cavalry operations',
  field651Uncontrolled1Updated: '$e Country $b States $e USA',
};
const marcTestSubstitutions = {
  auth1Original: ['United States', '4788734', '85140220'],
  auth1Substitute: ['AT_C605928 United States', '4788734605928', '85140220605928'],
  auth2Original: ['United States of America', '4788734', '85140220'],
  auth2Substitute: ['AT_C605928 United States of America', '4788734605928', '85140220605928'],
  bib1Original: ['The 6th United States Cavalry', 'sh85140220'],
  bib1Substitute: ['AT_C605928 The 6th United States Cavalry', 'sh85140220605928'],
};
const authoritySubfields = [
  {
    ruleId: '13',
    ruleSubfields: [
      'a',
      'g',
      'v',
      'x',
      'y',
      'z',
    ],
    autoLinkingEnabled: true,
  },
];

// Config to set up data import job profile for updating MARC authority
const baseProfileName = 'C605928 Update linked MARC authority and preserve controlled subfield order';
const mappingProfile = {
  name: `${baseProfileName} ${getRandomPostfix()}`,
};
const actionProfile = {
  folioRecordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
  name: `${baseProfileName} ${getRandomPostfix()}`,
  action: 'UPDATE',
};
const matchProfile = {
  profileName: `${baseProfileName} ${getRandomPostfix()}`,
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
  profileName: `${baseProfileName} ${getRandomPostfix()}`,
  acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
};

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit linked Authority record from Data Import', () => {
      before('Creating data', () => {
        // Make data unique to test run
        DataImport.editMarcFile(
          testData.firstAuthFileName,
          testData.firstAuthEditedFileName,
          marcTestSubstitutions.auth1Original,
          marcTestSubstitutions.auth1Substitute,
        );

        DataImport.editMarcFile(
          testData.bibFileName,
          testData.bibEditedFileName,
          marcTestSubstitutions.bib1Original,
          marcTestSubstitutions.bib1Substitute,
        );

        DataImport.editMarcFile(
          testData.secondAuthFileName,
          testData.secondAuthEditedFileName,
          marcTestSubstitutions.auth2Original,
          marcTestSubstitutions.auth2Substitute,
        );
        cy.getAdminToken();

        NewFieldMappingProfile.createMappingProfileForUpdateMarcAuthViaApi(mappingProfile)
          .then((fmpResponse) => {
            mappingProfile.id = fmpResponse.body.id;
            return NewActionProfile.createActionProfileViaApi(actionProfile, mappingProfile.id);
          })
          .then((apResponse) => {
            actionProfile.id = apResponse.body.id;
            return NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(
              matchProfile,
            );
          })
          .then((mpResponse) => {
            matchProfile.id = mpResponse.body.id;
            NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
              jobProfile.profileName,
              matchProfile.id,
              actionProfile.id,
            );
          });

        authoritySubfields.forEach(({ ruleId, ruleSubfields, autoLinkingEnabled }) => {
          QuickMarcEditor.setAuthoritySubfieldsViaApi(ruleId, ruleSubfields, autoLinkingEnabled);
        });

        // Upload authority
        DataImport.uploadFileViaApi(
          testData.firstAuthEditedFileName,
          testData.firstAuthUpdatedFileName,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        ).then((response) => {
          testData.createdAuthorityID = response[0].authority.id;

          // Upload instance
          DataImport.uploadFileViaApi(
            testData.bibEditedFileName,
            testData.bibUpdatedFileName,
            DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          ).then((bibResponse) => {
            testData.createdBibID = bibResponse[0].instance.id;

            QuickMarcEditor.linkMarcRecordsViaApi({
              bibId: testData.createdBibID,
              authorityIds: [testData.createdAuthorityID],
              bibFieldTags: [testData.tag651],
              authorityFieldTags: [testData.tag151],
              finalBibFieldContents: [`${testData.field651Initial} ${testData.field651Uncontrolled2}`],
              bibFieldIndexes: [testData.field651Index],
            });
            MarcAuthorities.waitAuthorityLinked(testData.createdAuthorityID, 1);
          });
        });

        cy.createTempUser([
          Permissions.moduleDataImportEnabled.gui,
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;
          cy.waitForAuthRefresh(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.dataImportPath,
              waiter: DataImport.waitLoading,
            });
            cy.reload();
          }, 20_000);
        });
      });

      after('Deleting data', () => {
        FileManager.deleteFile(`cypress/fixtures/${testData.firstAuthEditedFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${testData.secondAuthEditedFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${testData.bibEditedFileName}`);
        cy.getAdminToken();
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        QuickMarcEditor.setAuthoritySubfieldsDefault();
        if (testData.createdAuthorityID) MarcAuthority.deleteViaAPI(testData.createdAuthorityID);
        if (testData.createdBibID) InventoryInstance.deleteInstanceViaApi(testData.createdBibID);
        if (testData.userProperties) Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C605928 Check order of controlled subfields in MARC bib field after update of linked "MARC authority" record via "Data import" (promin)',
        { tags: ['extendedPath', 'promin', 'C605928'] },
        () => {
          // Upload authority update
          DataImport.verifyUploadState();
          DataImport.uploadFile(testData.secondAuthEditedFileName, testData.secondAuthUpdatedFileName);
          JobProfiles.waitLoadingList();
          JobProfiles.search(jobProfile.profileName);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(testData.secondAuthUpdatedFileName);
          Logs.checkJobStatus(testData.secondAuthUpdatedFileName, testData.jobStatusCompleted);

          // Review upload
          Logs.openFileDetails(testData.secondAuthUpdatedFileName);
          [
            FileDetails.columnNameInResultList.srsMarc,
            FileDetails.columnNameInResultList.authority,
          ].forEach((columnName) => {
            FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
          });

          // Locate updated record and verify linking
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
          MarcAuthorities.waitLoading();
          MarcAuthorities.searchBy(testData.keywordOption, testData.updatedAuthTitle);
          MarcAuthorities.verifyResultsRowContent(testData.updatedAuthTitle, testData.authorityAuthorized, testData.authorityHeadingType);
          MarcAuthorities.verifyNumberOfTitlesForRowWithValue(testData.updatedAuthTitle, 1);

          // Verify updated record field value
          MarcAuthorities.checkRowsCount(1);
          MarcAuthorities.selectFirstRecord();
          MarcAuthority.waitLoading();
          MarcAuthority.contains(testData.updatedAuth151);

          // Verify instance is shown
          MarcAuthorities.clickNumberOfTitlesByHeading(testData.updatedAuthTitle);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();

          // Open editor and verify 2nd linked 651's controlled and uncontrolled input order
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.verifyTagFieldAfterLinking(
            testData.field651Index,
            testData.tag651,
            testData.field651Ind1,
            testData.field651Ind2,
            testData.field651ControlledUpdated,
            testData.field651Uncontrolled1Updated,
            `$0 ${testData.field651Uri}`,
            testData.field651Uncontrolled2,
          );
        }
      );
    });
  });
});
