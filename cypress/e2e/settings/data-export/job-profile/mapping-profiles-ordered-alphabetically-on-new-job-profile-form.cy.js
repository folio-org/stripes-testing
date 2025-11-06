import permissions from '../../../../support/dictionary/permissions';
import ExportJobProfiles from '../../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ExportNewJobProfile from '../../../../support/fragments/data-export/exportJobProfile/exportNewJobProfile';
import DeleteFieldMappingProfile from '../../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import ExportNewFieldMappingProfile from '../../../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';
import SettingsDataExport from '../../../../support/fragments/data-export/settingsDataExport';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

let user;
const mappingProfiles = [
  { name: `AT_C345413_A_MappingProfile_${getRandomPostfix()}`, id: null },
  { name: `AT_C345413_B_MappingProfile_${getRandomPostfix()}`, id: null },
  { name: `AT_C345413_C_MappingProfile_${getRandomPostfix()}`, id: null },
  { name: `AT_C345413_D_MappingProfile_${getRandomPostfix()}`, id: null },
  { name: `AT_C345413_Z_MappingProfile_${getRandomPostfix()}`, id: null },
];

describe('Data Export', () => {
  describe('Job profile - setup', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.dataExportViewAddUpdateProfiles.gui]).then(
        (userProperties) => {
          user = userProperties;

          mappingProfiles.forEach((profile) => {
            ExportNewFieldMappingProfile.createNewFieldMappingProfileViaApi(profile.name).then(
              (response) => {
                profile.id = response.body.id;
              },
            );
          });

          cy.login(user.username, user.password, {
            path: TopMenu.settingsPath,
            waiter: SettingsPane.waitLoading,
          });
        },
      );
    });

    after('delete test data', () => {
      cy.getAdminToken();

      mappingProfiles.forEach((profile) => {
        DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(profile.id);
      });

      Users.deleteViaApi(user.userId);
    });

    it(
      'C345413 Mapping profiles are ordered alphabetically on new job profile form (firebird)',
      { tags: ['extendedPath', 'firebird', 'C345413'] },
      () => {
        // Step 1: Open "Settings" app by clicking "Settings" button in the header
        SettingsPane.waitLoading();

        // Step 2: Click "Data export" in "Settings" pane
        SettingsDataExport.goToSettingsDataExport();

        // Step 3: Click "Job profiles" option under "Profiles" label
        ExportJobProfiles.verifyJobProfilesElements();
        ExportJobProfiles.verifyNewButtonEnabled();
        ExportJobProfiles.verifyJobProfilesCount();

        // Step 4: Click "New" button in "Job profiles" pane
        ExportJobProfiles.openNewJobProfileForm();
        ExportNewJobProfile.verifyNewJobProfileForm();

        // Step 5: Click on "Mapping profile" dropdown and verify mapping profiles are ordered alphabetically
        ExportNewJobProfile.verifyMappingProfilesOrderedAlphabetically();
      },
    );
  });
});
