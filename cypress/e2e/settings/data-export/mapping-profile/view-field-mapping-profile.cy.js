import permissions from '../../../../support/dictionary/permissions';
import DeleteFieldMappingProfile from '../../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import ExportFieldMappingProfiles from '../../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import ExportNewFieldMappingProfile from '../../../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';
import SingleFieldMappingProfilePane from '../../../../support/fragments/data-export/exportMappingProfile/singleFieldMappingProfilePane';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../support/utils/stringTools';

let user;
const profileDetails = {
  name: getTestEntityValue('fieldMappingProfile'),
  recordType: 'Source record storage (entire record)',
  outputFormat: 'MARC',
  description: 'No value set-',
};

describe('Data Export', () => {
  describe('Mapping profile - setup', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.dataExportSettingsViewOnly.gui]).then((userProperties) => {
        user = userProperties;
        cy.getAdminSourceRecord().then((adminSourceRecord) => {
          profileDetails.source = adminSourceRecord;
          ExportNewFieldMappingProfile.createNewFieldMappingProfileViaApi(profileDetails.name);
        });
        cy.login(user.username, user.password, {
          path: TopMenu.settingsPath,
          waiter: SettingsPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      ExportFieldMappingProfiles.getFieldMappingProfile({
        query: `"name"=="${profileDetails.name}"`,
      }).then((response) => {
        DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(response.id);
      });
      Users.deleteViaApi(user.userId);
    });

    it(
      'C10985 View existing mapping profile (firebird)',
      { tags: ['criticalPath', 'firebird', 'C10985'] },
      () => {
        ExportFieldMappingProfiles.goToFieldMappingProfilesTab();
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(profileDetails.name);
        SingleFieldMappingProfilePane.waitLoading(profileDetails.name);
        SingleFieldMappingProfilePane.verifyProfileDetails(profileDetails);
      },
    );
  });
});
