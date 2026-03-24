import ExportFieldMappingProfiles from '../../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../../support/fragments/topMenu';
import { parseSanityParameters } from '../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();

describe('Data Export', () => {
  describe('Mapping profiles', () => {
    before('login', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password, { log: false });

      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: TopMenu.settingsPath,
        waiter: SettingsPane.waitLoading,
      });
      cy.allure().logCommandSteps(true);
      ExportFieldMappingProfiles.openTabFromDataExportSettingsList();
    });

    it(
      'C10982 "Settings" > "Data export" > "Field mapping profiles" page (firebird)',
      { tags: ['dryRun', 'firebird', 'C10982'] },
      () => {
        ExportFieldMappingProfiles.verifyFieldMappingProfilesPane();
        ExportFieldMappingProfiles.verifyDefaultProfiles();
      },
    );
  });
});
