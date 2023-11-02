import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import getRandomPostfix from '../../../support/utils/stringTools';
import Users from '../../../support/fragments/users/users';
import DeleteFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import ExportNewFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';
import ExportJobProfiles from '../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ExportNewJobProfile from '../../../support/fragments/data-export/exportJobProfile/exportNewJobProfile';

let user;
let fieldMappingProfileId;
const newJobProfileName = `jobProfile${getRandomPostfix()}`;
const fieldMappingProfileName = `fieldMappingProfile${getRandomPostfix()}`;

describe('Job profile - setup', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.dataExportEnableSettings.gui,
      permissions.dataExportEnableApp.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.settingsPath,
        waiter: SettingsPane.waitLoading,
      });
    });

    ExportNewFieldMappingProfile.createNewFieldMappingProfileViaApi(fieldMappingProfileName).then(
      (response) => {
        fieldMappingProfileId = response.body.id;
        ExportNewJobProfile.createNewJobProfileViaApi(newJobProfileName, response.body.id);
      },
    );
  });

  after('delete test data', () => {
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
    { tags: [testTypes.criticalPath, devTeams.firebird] },
    () => {
      ExportJobProfiles.goToJobProfilesTab();

      [newJobProfileName, 'random-string', 'Default', getRandomPostfix()].forEach((element) => {
        ExportJobProfiles.searchJobProfile(element);
        ExportJobProfiles.verifyJobProfileSearchResult(element);
      });
    },
  );
});
