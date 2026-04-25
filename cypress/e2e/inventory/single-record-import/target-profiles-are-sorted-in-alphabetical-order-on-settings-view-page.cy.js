import { EXISTING_RECORD_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import ActionProfiles from '../../../support/fragments/settings/dataImport/actionProfiles/actionProfiles';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import JobProfiles from '../../../support/fragments/settings/dataImport/jobProfiles/jobProfiles';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import NewTargetProfile from '../../../support/fragments/settings/inventory/integrations/newTargetProfile';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../support/fragments/settings/inventory/settingsInventory';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Single record import', () => {
    let user;
    const targetProfileName = `C396371 autotest target profile${getRandomPostfix()}`;
    const mappingProfileForCreate = {
      name: `C396371 autotest mappingProfileForCreate${getRandomPostfix()}`,
    };
    const mappingProfileForUpdate = {
      name: `C396371 autotest mappingProfileForUpdate${getRandomPostfix()}`,
      catalogedDate: '###TODAY###',
    };
    const actionProfileForCreate = {
      name: `C396371 autotest actionProfileForCreate${getRandomPostfix()}`,
      action: 'CREATE',
      folioRecordType: 'INSTANCE',
    };
    const actionProfileForUpdate = {
      name: `C396371 autotest actionProfileForUpdate${getRandomPostfix()}`,
      action: 'UPDATE',
      folioRecordType: 'INSTANCE',
    };
    const matchProfile = {
      profileName: `C396371 match profile.${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '035',
        in1: '9',
        in2: '*',
        subfield: 'a',
      },
      recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
      existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
      instanceOption: NewMatchProfile.optionsList.systemControlNumber,
      identifierTypeId: '7e591197-f335-4afb-bc6d-a6d76ca3bace',
    };
    const profilesForCreate = [
      {
        jobProfile: `A-profile.${getRandomPostfix()}`,
      },
      {
        jobProfile: `B-profile.${getRandomPostfix()}`,
      },
      {
        jobProfile: `M-profile.${getRandomPostfix()}`,
      },
      {
        jobProfile: `X-profile.${getRandomPostfix()}`,
      },
      {
        jobProfile: `Z-profile.${getRandomPostfix()}`,
      },
    ];
    const profilesForUpdate = [
      {
        jobProfile: `A-profile.${getRandomPostfix()}`,
      },
      {
        jobProfile: `B-profile.${getRandomPostfix()}`,
      },
      {
        jobProfile: `M-profile.${getRandomPostfix()}`,
      },
      {
        jobProfile: `X-profile.${getRandomPostfix()}`,
      },
      {
        jobProfile: `Z-profile.${getRandomPostfix()}`,
      },
    ];

    describe('Single record import', () => {
      before('Create test data and login', () => {
        cy.getAdminToken();
        NewFieldMappingProfile.createInstanceMappingProfileViaApi(mappingProfileForCreate).then(
          (mappingProfileResponse) => {
            mappingProfileForCreate.id = mappingProfileResponse.body.id;

            NewActionProfile.createActionProfileViaApi(
              actionProfileForCreate,
              mappingProfileResponse.body.id,
            ).then((actionProfileResponse) => {
              actionProfileForCreate.id = actionProfileResponse.body.id;

              profilesForCreate.forEach((profile) => {
                NewJobProfile.createJobProfileWithLinkedActionProfileViaApi(
                  profile.jobProfile,
                  actionProfileResponse.body.id,
                ).then((id) => {
                  profilesForCreate.find((p) => p.jobProfile === profile.jobProfile).id = id;
                });
              });
            });
          },
        );
        NewMatchProfile.createMatchProfileWithIncomingAndExistingOCLCMatchExpressionViaApi(
          matchProfile,
        ).then((matchProfileResponse) => {
          matchProfile.id = matchProfileResponse.body.id;

          NewFieldMappingProfile.createInstanceMappingProfileForUpdateViaApi(
            mappingProfileForUpdate,
          ).then((mappingProfileResponse) => {
            mappingProfileForUpdate.id = mappingProfileResponse.body.id;

            NewActionProfile.createActionProfileViaApi(
              actionProfileForUpdate,
              mappingProfileResponse.body.id,
            ).then((actionProfileResponse) => {
              actionProfileForUpdate.id = actionProfileResponse.body.id;

              profilesForUpdate.forEach((profile) => {
                NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
                  profile.jobProfile,
                  matchProfileResponse.body.id,
                  actionProfileResponse.body.id,
                ).then((id) => {
                  profilesForUpdate.find((p) => p.jobProfile === profile.jobProfile).id = id;
                });
              });
            });
          });
        });

        cy.createTempUser([
          Permissions.uiInventorySingleRecordImport.gui,
          Permissions.settingsDataImportEnabled.gui,
          Permissions.uiInventorySettingsConfigureSingleRecordImport.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.settingsPath,
            waiter: SettingsPane.waitLoading,
          });
          SettingsInventory.goToSettingsInventory();
          SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.TARGET_PROFILES);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Z3950TargetProfiles.getTargetProfileIdViaApi({
          query: `name="${targetProfileName}"`,
        }).then((profileId) => {
          Z3950TargetProfiles.deleteTargetProfileViaApi(profileId);
        });
        profilesForCreate.forEach((profile) => {
          JobProfiles.deleteJobProfileViaApi(profile.id);
        });
        profilesForUpdate.forEach((profile) => {
          JobProfiles.deleteJobProfileViaApi(profile.id);
        });
        MatchProfiles.deleteMatchProfileViaApi(matchProfile.id);
        ActionProfiles.deleteActionProfileViaApi(actionProfileForCreate.id);
        ActionProfiles.deleteActionProfileViaApi(actionProfileForUpdate.id);
        FieldMappingProfiles.deleteMappingProfileViaApi(mappingProfileForCreate.id);
        FieldMappingProfiles.deleteMappingProfileViaApi(mappingProfileForUpdate.id);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C396371 Verify that ISRI Z39.50 target profiles are sorted in alphabetical order on Settings View page (folijet)',
        { tags: ['extendedPath', 'folijet', 'C396371'] },
        () => {
          const createProfileOrder = [3, 4, 2, 0, 1];
          const updateProfileOrder = [2, 1, 4, 0, 3];

          Z3950TargetProfiles.create();
          NewTargetProfile.fillName(targetProfileName);
          createProfileOrder.forEach((profileIndex, position) => {
            NewTargetProfile.addJobProfileForImportCreate();
            NewTargetProfile.selectJobProfileForImportCreate(
              `${profilesForCreate[profileIndex].jobProfile} (${profilesForCreate[profileIndex].id})`,
              position,
              position,
            );
          });
          NewTargetProfile.setDefaultJobProfileForCreate(0);
          updateProfileOrder.forEach((profileIndex, position) => {
            NewTargetProfile.addJobProfileForOverlayUpdate();
            NewTargetProfile.selectJobProfileForOverlayUpdate(
              `${profilesForUpdate[profileIndex].jobProfile} (${profilesForUpdate[profileIndex].id})`,
              position,
              position,
            );
          });
          NewTargetProfile.setDefaultJobProfileForUpdate(0);
          NewTargetProfile.save();
          Z3950TargetProfiles.verifyTargetProfileIsCreated(targetProfileName);
          Z3950TargetProfiles.verifyJobProfilesForImportCreateAscendingOrder();
          Z3950TargetProfiles.verifyJobProfilesForOverlayUpdateAscendingOrder();
        },
      );
    });
  });
});
