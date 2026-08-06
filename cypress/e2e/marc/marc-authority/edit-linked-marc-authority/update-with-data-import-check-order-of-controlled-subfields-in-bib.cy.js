import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
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
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import NewFieldMappingProfile from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
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
  authorityAuthorized: 'Authorized',
  authorityHeadingType: 'Geographic Name',
  tag651: '651',
  tag151: '151',
  field651_2: 29,
  field651_2_ind1: '\\',
  field651_2_ind2: '\\',
  bib651Controlled: '$a United States',
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
  typeValue: FOLIO_RECORD_TYPE.MARCAUTHORITY,
  name: `${baseProfileName} ${getRandomPostfix()}`,
  action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
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
        // create Match profile
        NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(matchProfile);

        // create Field mapping profile
        NewFieldMappingProfile.createMappingProfileForUpdateMarcAuthViaApi(mappingProfile);

        // create Action profile and link it to Field mapping profile
        TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.SETTINGS);
        SettingsDataImport.goToSettingsDataImport();
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsActionProfiles.create(actionProfile, mappingProfile.name);
        cy.wait(3000);

        // create Job profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.openNewJobProfileForm();
        NewJobProfile.fillJobProfile(jobProfile);
        NewJobProfile.linkMatchProfile(matchProfile.profileName);
        NewJobProfile.linkActionProfileForMatches(actionProfile.name);
        NewJobProfile.linkActionProfileForNonMatches(defaultActionProfileName);
        // wait for the action profile to be linked
        cy.wait(1000);
        NewJobProfile.saveAndClose();

        // Upload authority
        DataImport.uploadFileViaApi(
          testData.firstAuthFileName,
          testData.firstAuthUpdatedFileName,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        ).then((response) => {
          response.forEach((record) => {
            testData.createdAuthorityID = record.authority.id;
          });
        });

        // Upload instance
        DataImport.uploadFileViaApi(
          testData.bibFileName,
          testData.bibUpdatedFileName,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        ).then((response) => {
          response.forEach((record) => {
            testData.createdBibID = record.authority.id;
          });
        });

        // Link bib to authority
        // The finalBibFieldContents are not exactly correct after this operation since
        // this method just appends $0 at the end. The first step in the spec will do an
        // update that should then replace it with the correct order - what this test is
        // ultimately checking for.
        QuickMarcEditor.linkMarcRecordsViaApi({
          bibId: testData.createdBibID,
          authorityIds: [testData.createdAuthorityID],
          bibFieldTags: [testData.tag651],
          authorityFieldTags: [testData.tag151],
          finalBibFieldContents: [`${testData.bib651Controlled} ${testData.bib651Uncontrolled1} ${testData.bib651Uncontrolled2}`],
          bibFieldIndexes: [testData.bibField651_2],
        });
        MarcAuthorities.waitAuthorityLinked(testData.createdAuthorityID, 1);

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
        if (testData.createdBibID) InventoryInstance.deleteInstanceViaApi(testData.createdBibId);
        if (testData.userProperties) Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C605928 Check order of controlled subfields in MARC bib\'s field after update of linked "MARC authority" record via "Data import" (promin)',
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
          Logs.verifyInstanceStatus(0, 2, RECORD_STATUSES.UPDATED);
          Logs.verifyInstanceStatus(0, 6, RECORD_STATUSES.UPDATED);

          // Locate updated record and verify linking
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
          MarcAuthorities.waitLoading();
          MarcAuthorities.searchBy(keywordOption, testData.updatedAuthTitle);
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
