import {
  ACCEPTED_DATA_TYPE_NAMES,
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  RECORD_STATUSES,
} from '../../../../support/constants';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../../support/fragments/settings/dataImport/settingsDataImport';

import Permissions from '../../../../support/dictionary/permissions';
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
  firstAuthUpdatedFileName: `testMarcFileUpd.${getRandomPostfix()}.mrc`,
  secondAuthFileName: 'marcAuthFileForC605928-2.mrc',
  secondAuthUpdatedFileName: `testMarcFileUpd.${getRandomPostfix()}.mrc`,
  bibFileName: 'marcBibFileForC605928.mrc',
  bibUpdatedFileName: `testMarcFileUpd.${getRandomPostfix()}.mrc`,
  jobStatusCompleted: 'Completed',
  keywordOption: 'Keyword',
  authorityAuthorized: 'Authorized',
  authorityHeadingType: 'Geographic Name',
  tag651: '651',
  tag151: '151',
  field651_2: 28,
  field651_2_ind1: '\\',
  field651_2_ind2: '0',
  bib651Controlled: '$a United States of America', // TODO This should probably be the full uncontrolled...
  // TODO consolidate and unify these, some repetition and different names for same things going on
  bib651Uri: 'http://id.loc.gov/authorities/subjects/sh85140220',
  bib651Uncontrolled1: '$x History $e Country $b States $e USA $y Civil War, 1861-1865 $x Cavalry operations.',
  bib651Uncontrolled2: '$8 number801 $1 URI1 $8 number802',
  updatedAuthTitle: 'United States of America USA Independence war History Civil War, 1861-1865 Cavalry operations',
  updatedAuth151: '$a United States of America $z USA $y Independence war $x History $y Civil War, 1861-1865 $x Cavalry operations',
};

// Config to set up data import job profile for updating MARC authority
const defaultActionProfileName = 'Default - Create MARC Authority';
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

        // Upload authority
        DataImport.uploadFileViaApi(
          testData.firstAuthFileName,
          testData.firstAuthUpdatedFileName,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        ).then((response) => {
          testData.createdAuthorityID = response[0].authority.id;

          // Upload instance
          DataImport.uploadFileViaApi(
            testData.bibFileName,
            testData.bibUpdatedFileName,
            DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          ).then((response) => {
            testData.createdBibID = response[0].instance.id;

            QuickMarcEditor.linkMarcRecordsViaApi({
              bibId: testData.createdBibID,
              authorityIds: [testData.createdAuthorityID],
              bibFieldTags: [testData.tag651],
              authorityFieldTags: [testData.tag151],
              finalBibFieldContents: [`${testData.bib651Controlled} ${testData.bib651Uncontrolled1} ${testData.bib651Uncontrolled2}`],
              bibFieldIndexes: [testData.field651_2],
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
        cy.getAdminToken();
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
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
          DataImport.uploadFile(testData.secondAuthFileName, testData.secondAuthUpdatedFileName);
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
          // TODO testrail spec says uncontrolled should be something else - discrepancy because
          // of error in testrail spec or error in setup? when it's originally set before the update,
          // by me, effectively, is that affecting this outcome?
          QuickMarcEditor.verifyTagFieldAfterLinking(
            testData.field651_2,
            testData.tag651, 
            testData.field651_2_ind1,
            testData.field651_2_ind2,
            testData.bib651Controlled,
            testData.bib651Uncontrolled1,
            `$0 ${testData.bib651Uri}`,
            testData.bib651Uncontrolled2,
          );
        }
      );
    });
  });
});
