import { APPLICATION_NAMES, EXISTING_RECORD_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import {
  NewMatchProfile,
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../support/fragments/settings/inventory/settingsInventory';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const abcProfile = {
  createJobProfile: `abc createJobProfile.${getRandomPostfix()}`,
  createActionProfile: {
    name: `abc autotest actionProfile${getRandomPostfix()}`,
    action: 'CREATE',
    folioRecordType: 'INSTANCE',
  },
  createMappingProfile: { name: `abc autotest mappingProfile${getRandomPostfix()}` },
  updateJobProfile: `abc updateJobProfile.${getRandomPostfix()}`,
  updateMatchProfile: {
    profileName: `abc updateJobProfile.${getRandomPostfix()}`,
    incomingRecordFields: {
      field: '001',
      in1: '',
      in2: '',
      subfield: '',
    },
    recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
    existingMatchExpressionValue: 'instance.hrid',
  },
  updateActionProfile: {
    name: `abc autotest actionProfile${getRandomPostfix()}`,
    action: 'UPDATE',
    folioRecordType: 'INSTANCE',
  },
  updateMappingProfile: { name: `abc autotest mappingProfile${getRandomPostfix()}` },
};
const adcProfile = {
  createJobProfile: `adc createJobProfile.${getRandomPostfix()}`,
  createActionProfile: {
    name: `adc autotest actionProfile${getRandomPostfix()}`,
    action: 'CREATE',
    folioRecordType: 'INSTANCE',
  },
  createMappingProfile: { name: `adc autotest mappingProfile${getRandomPostfix()}` },
  updateJobProfile: `adc updateJobProfile.${getRandomPostfix()}`,
  updateMatchProfile: {
    profileName: `abc updateJobProfile.${getRandomPostfix()}`,
    incomingRecordFields: {
      field: '001',
      in1: '',
      in2: '',
      subfield: '',
    },
    recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
    existingMatchExpressionValue: 'instance.hrid',
  },
  updateActionProfile: {
    name: `adc autotest actionProfile${getRandomPostfix()}`,
    action: 'UPDATE',
    folioRecordType: 'INSTANCE',
  },
  updateMappingProfile: { name: `adc autotest mappingProfile${getRandomPostfix()}` },
};
const zbcProfile = {
  createJobProfile: `zbc createJobProfile.${getRandomPostfix()}`,
  createActionProfile: {
    name: `zbc autotest actionProfile${getRandomPostfix()}`,
    action: 'CREATE',
    folioRecordType: 'INSTANCE',
  },
  createMappingProfile: { name: `zbc autotest mappingProfile${getRandomPostfix()}` },
  updateJobProfile: `zbc updateJobProfile.${getRandomPostfix()}`,
  updateMatchProfile: {
    profileName: `abc updateJobProfile.${getRandomPostfix()}`,
    incomingRecordFields: {
      field: '001',
      in1: '',
      in2: '',
      subfield: '',
    },
    recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
    existingMatchExpressionValue: 'instance.hrid',
  },
  updateActionProfile: {
    name: `zbc autotest actionProfile${getRandomPostfix()}`,
    action: 'UPDATE',
    folioRecordType: 'INSTANCE',
  },
  updateMappingProfile: { name: `zbc autotest mappingProfile${getRandomPostfix()}` },
};
const zdcProfile = {
  createJobProfile: `zdc createJobProfile.${getRandomPostfix()}`,
  createActionProfile: {
    name: `zdc autotest actionProfile${getRandomPostfix()}`,
    action: 'CREATE',
    folioRecordType: 'INSTANCE',
  },
  createMappingProfile: { name: `zdc autotest mappingProfile${getRandomPostfix()}` },
  updateJobProfile: `zdc updateJobProfile.${getRandomPostfix()}`,
  updateMatchProfile: {
    profileName: `abc updateJobProfile.${getRandomPostfix()}`,
    incomingRecordFields: {
      field: '001',
      in1: '',
      in2: '',
      subfield: '',
    },
    recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
    existingMatchExpressionValue: 'instance.hrid',
  },
  updateActionProfile: {
    name: `zdc autotest actionProfile${getRandomPostfix()}`,
    action: 'UPDATE',
    folioRecordType: 'INSTANCE',
  },
  updateMappingProfile: { name: `zdc autotest mappingProfile${getRandomPostfix()}` },
};

describe('Inventory', () => {
  describe('Settings', () => {
    let user;
    const createJobProfileIds = [];
    const updateJobProfileIds = [];
    const targetProfileName = `C374176 autotest profile${getRandomPostfix()}`;
    let profileId;

    before('Create test data and login', () => {
      cy.getAdminToken()
        .then(() => {
          // create job profiles for create
          [zbcProfile, adcProfile, zdcProfile, abcProfile].forEach((profile) => {
            NewFieldMappingProfile.createInstanceMappingProfileViaApi(
              profile.createMappingProfile,
            ).then((mappingProfileResponse) => {
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
            });
          });
          // create job profile for update
          [abcProfile, zbcProfile, zdcProfile, adcProfile].forEach((profile) => {
            NewFieldMappingProfile.createInstanceMappingProfileViaApi(
              profile.updateMappingProfile,
            ).then((mappingProfileResponse) => {
              NewActionProfile.createActionProfileViaApi(
                profile.updateActionProfile,
                mappingProfileResponse.body.id,
              )
                .then((actionProfileResponse) => {
                  NewMatchProfile.createMatchProfileWithIncomingAndExistingMatchExpressionViaApi(
                    profile.updateMatchProfile,
                  ).then((matchProfileResponse) => {
                    NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
                      profile.updateJobProfile,
                      matchProfileResponse.body.id,
                      actionProfileResponse.body.id,
                    );
                  });
                })
                .then((id) => {
                  updateJobProfileIds.push(id);
                });
            });
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

    after('Delete test data', () => {
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
      { tags: ['criticalPath', 'folijet', 'C374176'] },
      () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        SettingsInventory.goToSettingsInventory();
        SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.TARGET_PROFILES);
        Z3950TargetProfiles.verifyTargetProfilesListDisplayed();
        Z3950TargetProfiles.openTargetProfile(profileId);
        Z3950TargetProfiles.verifyTargetProfileForm();
        Z3950TargetProfiles.verifyCreateInstanceJobProfileList(targetProfileName);
        Z3950TargetProfiles.verifyUpdateInstanceJobProfileList(targetProfileName);
      },
    );
  });
});
