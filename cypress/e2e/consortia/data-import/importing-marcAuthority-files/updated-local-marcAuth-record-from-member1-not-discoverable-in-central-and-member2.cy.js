/* eslint-disable newline-per-chained-call */
import {
  ACCEPTED_DATA_TYPE_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
  APPLICATION_NAMES,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import Logs from '../../../../support/fragments/data_import/logs/logs';
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
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    describe('Consortia', () => {
      const testData = {
        searchOption: 'Keyword',
        initialHeading: 'C405526 Gabaldon, Diana. Outlander novel.',
        updatedHeading: 'C405526 Gabaldon, Diana. 1952- Outlander (book series).',
        addedField: '400',
        addedFieldContent: '$a C405526 Diana J. Gabaldon $d 1952-',
        deletedField: '040',
        updated100Field: '$a C405526 Gabaldon, Diana. $d 1952- $t Outlander (book series).',
        createdAuthorityID: null,
      };

      const marcFiles = {
        initial: {
          marc: 'C405526MarcAuth.mrc',
          fileName: `C405526 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        },
        updated: {
          marc: 'C405526MarcAuthUpdated.mrc',
          fileName: `C405526 testMarcFileUpdated${getRandomPostfix()}.mrc`,
        },
      };

      const mappingProfile = {
        name: `C405526 Update MARC authority records by matching 010 $a subfield value ${getRandomPostfix()}`,
        typeValue: FOLIO_RECORD_TYPE.MARCAUTHORITY,
      };

      const actionProfile = {
        folioRecordType: 'MARC_AUTHORITY',
        name: `C405526 Update MARC authority records by matching 010 $a subfield value ${getRandomPostfix()}`,
        action: 'UPDATE',
      };

      const matchProfile = {
        profileName: `C405526 Update MARC authority records by matching 010 $a subfield value ${getRandomPostfix()}`,
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
        profileName: `C405526 Update MARC authority records by matching 010 $a subfield value ${getRandomPostfix()}`,
        acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
      };

      const users = {};

      before('Create test data and login', () => {
        cy.getAdminToken();

        // Create user with permissions for all three tenants
        cy.createTempUser([
          Permissions.moduleDataImportEnabled.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        ])
          .then((userProperties) => {
            users.userProperties = userProperties;

            // Assign affiliations to Member 1 (University) and Member 2 (College)
            cy.assignAffiliationToUser(Affiliations.University, users.userProperties.userId);
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(users.userProperties.userId, [
              Permissions.moduleDataImportEnabled.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            ]);

            cy.resetTenant();

            // Assign permissions in Member 2 (College) tenant
            cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(users.userProperties.userId, [
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            ]);
            cy.resetTenant();
          })
          .then(() => {
            // Create profiles in Member 1 (University) tenant
            cy.setTenant(Affiliations.University);

            // Create Match profile
            NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(matchProfile)
              .then((matchProfileResponse) => {
                matchProfile.id = matchProfileResponse.body.id;

                // Create Field mapping profile
                return NewFieldMappingProfile.createMappingProfileForUpdateMarcAuthViaApi(
                  mappingProfile,
                );
              })
              .then((mappingProfileResponse) => {
                mappingProfile.id = mappingProfileResponse.body.id;

                // Create Action profile
                return NewActionProfile.createActionProfileViaApi(actionProfile, mappingProfile.id);
              })
              .then((actionProfileResponse) => {
                actionProfile.id = actionProfileResponse.body.id;

                // Create Job profile
                return NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
                  jobProfile.profileName,
                  matchProfile.id,
                  actionProfile.id,
                );
              })
              .then(() => {
                // Import initial MARC authority file to Member 1 (University) tenant
                return DataImport.uploadFileViaApi(
                  marcFiles.initial.marc,
                  marcFiles.initial.fileName,
                  marcFiles.initial.jobProfileToRun,
                );
              })
              .then((response) => {
                response.forEach((record) => {
                  testData.createdAuthorityID = record.authority.id;
                });
              });
          })
          .then(() => {
            cy.resetTenant();
            cy.login(users.userProperties.username, users.userProperties.password, {
              path: TopMenu.dataImportPath,
              waiter: DataImport.waitLoading,
            }).then(() => {
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
              ConsortiumManager.switchActiveAffiliation(
                tenantNames.central,
                tenantNames.university,
              );
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
            });
          });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(users.userProperties.userId);

        cy.setTenant(Affiliations.University);
        if (testData.createdAuthorityID) {
          MarcAuthority.deleteViaAPI(testData.createdAuthorityID);
        }
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      });

      it(
        'C405526 Updated Local "MARC authority" record via "Data import" from Member 1 tenant is not discoverable in Central and Member 2 tenants (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C405526'] },
        () => {
          // Step 1-2: Search for existing Local MARC authority record in Member 1
          cy.visit(TopMenu.marcAuthorities);
          MarcAuthorities.waitLoading();
          MarcAuthorities.searchBy(testData.searchOption, testData.initialHeading);
          MarcAuthorities.checkRowsCount(1);

          // Step 3: Upload updated MARC file via Data Import
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          DataImport.verifyUploadState();
          DataImport.uploadFileAndRetry(marcFiles.updated.marc, marcFiles.updated.fileName);
          JobProfiles.waitLoadingList();

          // Step 4: Run the update job profile
          JobProfiles.search(jobProfile.profileName);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(marcFiles.updated.fileName);
          Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);

          // Step 5-7: Verify updated record
          Logs.openFileDetails(marcFiles.updated.fileName);
          Logs.verifyInstanceStatus(0, 2, RECORD_STATUSES.UPDATED);
          Logs.clickOnHotLink(0, 6, RECORD_STATUSES.UPDATED);
          MarcAuthority.waitLoading();

          // Verify new 400 field is added
          MarcAuthority.contains(testData.addedField);
          MarcAuthority.contains(testData.addedFieldContent);

          // Verify 040 field is deleted
          MarcAuthority.notContains(testData.deletedField);

          // Verify 100 field is updated
          MarcAuthority.contains(testData.updated100Field);

          // Step 8-10: Switch to Central tenant and verify record is NOT discoverable
          ConsortiumManager.switchActiveAffiliation(tenantNames.university, tenantNames.central);
          MarcAuthorities.waitLoading();
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

          MarcAuthorities.searchBy(testData.searchOption, testData.updatedHeading);
          MarcAuthorities.checkNoResultsMessage(
            `No results found for "${testData.updatedHeading}". Please check your spelling and filters.`,
          );

          // Step 11-13: Switch to Member 2 (College) tenant and verify record is NOT discoverable
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          MarcAuthorities.waitLoading();
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

          MarcAuthorities.searchBy(testData.searchOption, testData.updatedHeading);
          MarcAuthorities.checkNoResultsMessage(
            `No results found for "${testData.updatedHeading}". Please check your spelling and filters.`,
          );
        },
      );
    });
  });
});
