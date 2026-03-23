import { Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
// import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../support/fragments/settings/inventory/settingsInventory';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import NewTargetProfile from '../../../support/fragments/settings/inventory/integrations/newTargetProfile';

describe('Inventory', () => {
  let user;
  const targetProfileName = `C396371 autotest target profile${getRandomPostfix()}`;
  const profilesForCreate = [
    {
      jobProfile: `A-profile.${getRandomPostfix()}`,
      actionProfile: {
        name: `C396371 autotest actionProfileForCreate${getRandomPostfix()}`,
        action: 'CREATE',
        folioRecordType: 'INSTANCE',
      },
      mappingProfile: {
        name: `C396371 autotest mappingProfileForCreate${getRandomPostfix()}`,
      },
    },
    {
      jobProfile: `B-profile.${getRandomPostfix()}`,
      actionProfile: {
        name: `C396371 autotest actionProfileForCreate${getRandomPostfix()}`,
        action: 'CREATE',
        folioRecordType: 'INSTANCE',
      },
      mappingProfile: {
        name: `C396371 autotest mappingProfileForCreate${getRandomPostfix()}`,
      },
    },
    {
      jobProfile: `M-profile.${getRandomPostfix()}`,
      actionProfile: {
        name: `C396371 autotest actionProfileForCreate${getRandomPostfix()}`,
        action: 'CREATE',
        folioRecordType: 'INSTANCE',
      },
      mappingProfile: {
        name: `C396371 autotest mappingProfileForCreate${getRandomPostfix()}`,
      },
    },
    {
      jobProfile: `X-profile.${getRandomPostfix()}`,
      actionProfile: {
        name: `C396371 autotest actionProfileForCreate${getRandomPostfix()}`,
        action: 'CREATE',
        folioRecordType: 'INSTANCE',
      },
      mappingProfile: {
        name: `C396371 autotest mappingProfileForCreate${getRandomPostfix()}`,
      },
    },
    {
      jobProfile: `Z-profile.${getRandomPostfix()}`,
      actionProfile: {
        name: `C396371 autotest actionProfileForCreate${getRandomPostfix()}`,
        action: 'CREATE',
        folioRecordType: 'INSTANCE',
      },
      mappingProfile: {
        name: `C396371 autotest mappingProfileForCreate${getRandomPostfix()}`,
      },
    },
  ];
  const profileIds = [];

  describe('Single record import', () => {
    before('Create test data and login', () => {
      cy.getAdminToken();
      profilesForCreate.forEach((profile) => {
        NewFieldMappingProfile.createInstanceMappingProfileViaApi(profile.mappingProfile).then(
          (mappingProfileResponse) => {
            NewActionProfile.createActionProfileViaApi(
              profile.actionProfile,
              mappingProfileResponse.body.id,
            )
              .then((actionProfileResponse) => {
                NewJobProfile.createJobProfileWithLinkedActionProfileViaApi(
                  profile.jobProfile,
                  actionProfileResponse.body.id,
                );
              })
              .then((id) => {
                profileIds.push({
                  id,
                  displayName: `${profile.jobProfile} (${id})`,
                });
              });
          },
        );
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

    // after('Delete test data', () => {
    //   cy.getAdminToken();
    //   InventoryInstances.deleteInstanceByTitleViaApi(instanceTitle);
    //   InventoryInstances.deleteInstanceByTitleViaApi(originalInstanceTitle);
    //   Users.deleteViaApi(user.userId);
    // });

    it(
      'C396371 Verify that ISRI Z39.50 target profiles are sorted in alphabetical order on Settings View page (folijet)',
      { tags: ['extendedPath', 'folijet', 'C396371'] },
      () => {
        Z3950TargetProfiles.create();
        NewTargetProfile.fillName(targetProfileName);
        NewTargetProfile.addJobProfileForImportCreate();
        NewTargetProfile.selectJobProfileForImportCreate(
          `${profilesForCreate[3].jobProfile} (${profileIds[3].id})`,
          3,
          3,
        );
        // NewTargetProfile.addJobProfileForImportCreate();
        // NewTargetProfile.selectJobProfileForImportCreate(`${profilesForCreate[4].jobProfile} (${profileIds[4].id})`, 4, 4);
        // NewTargetProfile.addJobProfileForImportCreate();
        // NewTargetProfile.selectJobProfileForImportCreate(`${profilesForCreate[2].jobProfile} (${profileIds[2].id})`, 2, 2);
        // NewTargetProfile.addJobProfileForImportCreate();
        // NewTargetProfile.selectJobProfileForImportCreate(`${profilesForCreate[0].jobProfile} (${profileIds[0].id})`, 0, 0);
        // NewTargetProfile.addJobProfileForImportCreate();
        // NewTargetProfile.selectJobProfileForImportCreate(`${profilesForCreate[1].jobProfile} (${profileIds[1].id})`, 1, 1);
        // NewTargetProfile.addJobProfileForOverlayUpdate();
        // NewTargetProfile.selectJobProfileForOverlayUpdate(`${profilesForCreate[0].jobProfile} (${profileIds[0].id})`, 0, 0);
        // NewTargetProfile.addJobProfileForOverlayUpdate();
        // NewTargetProfile.selectJobProfileForOverlayUpdate(`${profilesForCreate[1].jobProfile} (${profileIds[1].id})`, 1, 1);
        // NewTargetProfile.addJobProfileForOverlayUpdate();
        // NewTargetProfile.selectJobProfileForOverlayUpdate(`${profilesForCreate[2].jobProfile} (${profileIds[2].id})`, 2, 2);
        // NewTargetProfile.addJobProfileForOverlayUpdate();
        // NewTargetProfile.selectJobProfileForOverlayUpdate(`${profilesForCreate[3].jobProfile} (${profileIds[3].id})`, 3, 3);
        // NewTargetProfile.addJobProfileForOverlayUpdate();
        // NewTargetProfile.selectJobProfileForOverlayUpdate(`${profilesForCreate[4].jobProfile} (${profileIds[4].id})`, 4, 4);
      },
    );
  });
});
