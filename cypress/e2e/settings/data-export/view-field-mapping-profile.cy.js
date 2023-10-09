import { getTestEntityValue } from '../../../support/utils/stringTools';
import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import Users from '../../../support/fragments/users/users';
import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import ExportFieldMappingProfiles from '../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import ExportNewFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';
import DeleteFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import SingleFieldMappingProfilePane from '../../../support/fragments/data-export/exportMappingProfile/singleFieldMappingProfilePane';

let user;
const profileDetails = {
  name: getTestEntityValue('fieldMappingProfile'),
  recordType: 'Source record storage (entire record)',
  outputFormat: 'MARC',
  description: 'No value set-',
  source: 'ADMINISTRATOR, Diku_admin',
};

describe('setting: data-export', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.dataExportEnableSettings.gui,
      permissions.dataExportEnableApp.gui,
      permissions.uiUsersView.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.settingsPath,
        waiter: SettingsPane.waitLoading,
      });
      ExportNewFieldMappingProfile.createNewFieldMappingProfileViaApi(profileDetails.name);
    });
  });

  after('delete test data', () => {
    ExportFieldMappingProfiles.getFieldMappingProfile({
      query: `"name"=="${profileDetails.name}"`,
    }).then((response) => {
      DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(response.id);
    });
    Users.deleteViaApi(user.userId);
  });

  it(
    'C10985 View existing mapping profile (firebird)',
    { tags: [testTypes.criticalPath, devTeams.firebird] },
    () => {
      ExportFieldMappingProfiles.goToFieldMappingProfilesTab();
      SingleFieldMappingProfilePane.clickProfileNameFromTheList(profileDetails.name);
      SingleFieldMappingProfilePane.waitLoading(profileDetails.name);
      SingleFieldMappingProfilePane.verifyProfileDetails(profileDetails);
    },
  );
});
