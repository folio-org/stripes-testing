import permissions from '../../../../support/dictionary/permissions';
import ExportJobProfiles from '../../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ExportNewJobProfile from '../../../../support/fragments/data-export/exportJobProfile/exportNewJobProfile';
import DeleteFieldMappingProfile from '../../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import ExportNewFieldMappingProfile from '../../../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

let user;
let fieldMappingProfileId;
const newJobProfileName = `jobProfile${getRandomPostfix()}`;
const fieldMappingProfileName = `fieldMappingProfile${getRandomPostfix()}`;

describe('Data Export', () => {
  describe('Job profile - setup', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.dataExportSettingsViewOnly.gui]).then((userProperties) => {
        user = userProperties;
        ExportNewFieldMappingProfile.createNewFieldMappingProfileViaApi(
          fieldMappingProfileName,
        ).then((response) => {
          fieldMappingProfileId = response.body.id;
          ExportNewJobProfile.createNewJobProfileViaApi(newJobProfileName, response.body.id);
        });
        cy.login(user.username, user.password, {
          path: TopMenu.settingsPath,
          waiter: SettingsPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      ExportJobProfiles.getJobProfile({ query: `"name"=="${newJobProfileName}"` }).then(
        (response) => {
          ExportJobProfiles.deleteJobProfileViaApi(response.id);
        },
      );
      DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(fieldMappingProfileId);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C345411 Search job profiles (firebird)',
      { tags: ['criticalPath', 'firebird', 'C345411'] },
      () => {
        ExportJobProfiles.goToJobProfilesTab();

        [newJobProfileName, 'random-string', 'Default', getRandomPostfix()].forEach((element) => {
          ExportJobProfiles.searchJobProfile(element);
          ExportJobProfiles.verifyJobProfileSearchResult(element);
        });
      },
    );
  });
});
