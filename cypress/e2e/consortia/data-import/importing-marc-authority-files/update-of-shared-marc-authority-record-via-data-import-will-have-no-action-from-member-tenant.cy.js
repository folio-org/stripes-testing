import {
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORD_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
  APPLICATION_NAMES,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../../support/fragments/settings/dataImport';
import NewFieldMappingProfile from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewActionProfile from '../../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = randomNDigitNumber(15);

      const authorityHeading = `AT_C407681_MarcAuthority_${randomPostfix}`;
      const relatedHeading = `AT_C407681_Related_${randomPostfix}`;
      const updatedRelatedHeading = `AT_C407681_RelatedUpdated_${randomPostfix}`;
      const naturalId = `${randomDigits}407681`;
      const tag010SubfieldA = `${randomDigits}0407681`;

      const exportedMarcFileName = `AT_C407681_exported_${randomPostfix}.mrc`;
      const editedMarcFileName = `AT_C407681_edited_${randomPostfix}.mrc`;

      // job profiles created in Member (College) tenant
      const mappingProfile = {
        name: `AT_C407681 Update MARC authority records by matching 010 $a ${randomPostfix}`,
      };
      const actionProfile = {
        name: `AT_C407681 Update MARC authority records by matching 010 $a ${randomPostfix}`,
        action: 'UPDATE',
        folioRecordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
      };
      const matchProfile = {
        profileName: `AT_C407681 Update MARC authority records by matching 010 $a ${randomPostfix}`,
        incomingRecordFields: { field: '010', in1: '', in2: '', subfield: 'a' },
        existingRecordFields: { field: '010', in1: '', in2: '', subfield: 'a' },
        recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
      };
      const jobProfile = {
        ...NewJobProfile.defaultJobProfile,
        profileName: `AT_C407681 Update MARC authority records by matching 010 $a ${randomPostfix}`,
        acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
      };

      const marcAuthFields = [
        { tag: '010', content: `$a ${tag010SubfieldA}`, indicators: ['\\', '\\'] },
        { tag: '100', content: `$a ${authorityHeading}`, indicators: ['1', '\\'] },
        // non-heading reference — this will be edited in the exported file
        { tag: '400', content: `$a ${relatedHeading}`, indicators: ['1', '\\'] },
      ];

      let user;
      let authorityId;

      before('Create test data, export, edit, login', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C407681_');

        // Create shared MARC authority in Central tenant
        MarcAuthorities.createMarcAuthorityViaAPI(naturalId, '', marcAuthFields).then((id) => {
          authorityId = id;
          // Export the authority directly via API (Central admin context)
          cy.downloadDataExportRecordViaApi(id, 'AUTHORITY').then((body) => {
            FileManager.createFile(`cypress/fixtures/${exportedMarcFileName}`, body);
            // Edit 400 $a (non-heading field) to test that changes won't apply from Member
            DataImport.editMarcFile(
              exportedMarcFileName,
              editedMarcFileName,
              [relatedHeading],
              [updatedRelatedHeading],
            );
          });
        });

        // Create update job profiles in Member (College) tenant
        cy.setTenant(Affiliations.College);
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

        // Create user in Central; assign College affiliation + permissions for both tenants
        cy.then(() => {
          cy.setTenant(Affiliations.College);
          cy.createTempUser([
            Permissions.moduleDataImportEnabled.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ]).then((userProperties) => {
            user = userProperties;

            cy.resetTenant();
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.moduleDataImportEnabled.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            ]);

            // Login to Member (College) tenant per preconditions
            cy.setTenant(Affiliations.College);
            cy.login(user.username, user.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          });
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        if (authorityId) MarcAuthority.deleteViaAPI(authorityId, true);

        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(user?.userId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);

        FileManager.deleteFile(`cypress/fixtures/${exportedMarcFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
      });

      it(
        'C407681 Update of Shared "MARC authority" record via "Data import" will have No action from Member tenant (promin)',
        { tags: ['extendedPathECS', 'promin', 'C407681'] },
        () => {
          // Steps 1-2: Verify shared authority is visible from Member tenant
          MarcAuthorities.searchBeats(authorityHeading);
          MarcAuthorities.verifyResultRowContentSharedIcon(authorityHeading, true);
          MarcAuthorities.selectIncludingTitle(authorityHeading);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(relatedHeading);
          MarcAuthorities.clickResetAndCheck(authorityHeading);

          // Steps 3-5: Import edited file via API from Member tenant → import completes
          cy.setTenant(Affiliations.College);
          cy.getToken(user.username, user.password);
          DataImport.uploadFileViaApi(
            editedMarcFileName,
            editedMarcFileName,
            jobProfile.profileName,
          );

          cy.then(() => {
            // Step 5-6: Verify Completed; open file details
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
            DataImport.waitLoading();
            Logs.checkJobStatus(editedMarcFileName, JOB_STATUS_NAMES.COMPLETED);
            Logs.openFileDetails(editedMarcFileName);
            // Step 6: SRS MARC shows "No action" — shared authority cannot be updated from Member
            FileDetails.checkStatusInColumn(
              RECORD_STATUSES.NO_ACTION,
              FileDetails.columnNameInResultList.srsMarc,
            );

            // Steps 7-10: Navigate to MARC Auth, verify record was NOT updated
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
            MarcAuthorities.waitLoading();
            MarcAuthorities.searchBeats(authorityHeading);
            MarcAuthorities.verifyResultRowContentSharedIcon(authorityHeading, true);
            MarcAuthorities.selectIncludingTitle(authorityHeading);
            MarcAuthority.waitLoading();
            // original 400 $a still present; edited value was not applied
            MarcAuthority.contains(relatedHeading);
            MarcAuthority.notContains(updatedRelatedHeading);
          });
        },
      );
    });
  });
});
