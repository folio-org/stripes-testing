import { Permissions } from '../../../support/dictionary';
import {
  JobProfiles as SettingsJobProfiles,
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  MatchProfiles as SettingsMatchProfiles,
  NewMatchProfile,
} from '../../../support/fragments/settings/dataImport';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const abcProfile = {
  createJobProfile: `abc createJobProfile.${getRandomPostfix()}`,
  createActionProfile: `abc autotest actionProfile${getRandomPostfix()}`,
  createMappingProfile: `abc autotest mappingProfile${getRandomPostfix()}`,
  updateJobProfile: `abc updateJobProfile.${getRandomPostfix()}`,
  updateMatchProfile: `abc updateJobProfile.${getRandomPostfix()}`,
  updateActionProfile: `abc autotest actionProfile${getRandomPostfix()}`,
  updateMappingProfile: `abc autotest mappingProfile${getRandomPostfix()}`,
};
const adcProfile = {
  createJobProfile: `adc createJobProfile.${getRandomPostfix()}`,
  createActionProfile: `adc autotest actionProfile${getRandomPostfix()}`,
  createMappingProfile: `adc autotest mappingProfile${getRandomPostfix()}`,
  updateJobProfile: `adc updateJobProfile.${getRandomPostfix()}`,
  updateMatchProfile: `abc updateJobProfile.${getRandomPostfix()}`,
  updateActionProfile: `adc autotest actionProfile${getRandomPostfix()}`,
  updateMappingProfile: `adc autotest mappingProfile${getRandomPostfix()}`,
};
const zbcProfile = {
  createJobProfile: `zbc createJobProfile.${getRandomPostfix()}`,
  createActionProfile: `zbc autotest actionProfile${getRandomPostfix()}`,
  createMappingProfile: `zbc autotest mappingProfile${getRandomPostfix()}`,
  updateJobProfile: `zbc updateJobProfile.${getRandomPostfix()}`,
  updateMatchProfile: `abc updateJobProfile.${getRandomPostfix()}`,
  updateActionProfile: `zbc autotest actionProfile${getRandomPostfix()}`,
  updateMappingProfile: `zbc autotest mappingProfile${getRandomPostfix()}`,
};
const zdcProfile = {
  createJobProfile: `zdc createJobProfile.${getRandomPostfix()}`,
  createActionProfile: `zdc autotest actionProfile${getRandomPostfix()}`,
  createMappingProfile: `zdc autotest mappingProfile${getRandomPostfix()}`,
  updateJobProfile: `zdc updateJobProfile.${getRandomPostfix()}`,
  updateMatchProfile: `abc updateJobProfile.${getRandomPostfix()}`,
  updateActionProfile: `zdc autotest actionProfile${getRandomPostfix()}`,
  updateMappingProfile: `zdc autotest mappingProfile${getRandomPostfix()}`,
};

describe('Inventory', () => {
  describe('Settings', () => {
    let user;
    const createJobProfileIds = [];
    const updateJobProfileIds = [];
    const targetProfileName = `C374176 autotest profile${getRandomPostfix()}`;
    let profileId;

    before('login', () => {
      cy.getAdminToken()
        .then(() => {
          // create job profiles for create
          [zbcProfile, adcProfile, zdcProfile, abcProfile].forEach((profile) => {
            NewFieldMappingProfile.createMappingProfileViaApi(profile.createMappingProfile).then(
              (mappingProfileResponse) => {
                NewActionProfile.createActionProfileViaApi(
                  profile.createActionProfile,
                  mappingProfileResponse.body.id,
                )
                  .then((actionProfileResponse) => {
                    NewJobProfile.createJobProfileWithLinkedActionProfileViaApi(
                      profile.createJobProfile,
                      actionProfileResponse.body.id,
                    );
                  })
                  .then((id) => createJobProfileIds.push(id));
              },
            );
          });
          // create job profile for update
          [abcProfile, zbcProfile, zdcProfile, adcProfile].forEach((profile) => {
            NewFieldMappingProfile.createMappingProfileViaApi(profile.updateMappingProfile).then(
              (mappingProfileResponse) => {
                NewActionProfile.createActionProfileViaApi(
                  profile.updateActionProfile,
                  mappingProfileResponse.body.id,
                  'UPDATE',
                )
                  .then((actionProfileResponse) => {
                    NewMatchProfile.createMatchProfileViaApi(profile.updateMatchProfile).then(
                      (matchProfileResponse) => {
                        NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
                          profile.updateJobProfile,
                          matchProfileResponse.body.id,
                          actionProfileResponse.body.id,
                        );
                      },
                    );
                  })
                  .then((id) => {
                    updateJobProfileIds.push(id);
                  });
              },
            );
          });
        })
        .then(() => {
          Z3950TargetProfiles.createNewZ3950TargetProfileViaApi(
            targetProfileName,
            createJobProfileIds,
            updateJobProfileIds,
          ).then((initialId) => {
            profileId = initialId;
          });
        });

      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.uiInventorySettingsConfigureSingleRecordImport.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        [abcProfile, zbcProfile, zdcProfile, adcProfile].forEach((profile) => {
          SettingsJobProfiles.deleteJobProfileByNameViaApi(profile.createJobProfile);
          SettingsJobProfiles.deleteJobProfileByNameViaApi(profile.updateJobProfile);
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(profile.updateMatchProfile);
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.createActionProfile);
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.updateActionProfile);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.createMappingProfile,
          );
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.updateMappingProfile,
          );
        });
        Z3950TargetProfiles.deleteTargetProfileViaApi(profileId);
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C374176 Verify the view mode of ISRI profiles (folijet)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        cy.visit(SettingsMenu.targetProfilesPath);
        Z3950TargetProfiles.verifyTargetProfileFormOpened();
        Z3950TargetProfiles.openTargetProfile(profileId);
        Z3950TargetProfiles.verifyTargetProfileForm();
        Z3950TargetProfiles.verifyCreateInstanceJobProfileList(targetProfileName);
        Z3950TargetProfiles.verifyUpdateInstanceJobProfileList(targetProfileName);
      },
    );
  });
});
