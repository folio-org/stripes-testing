import ExportJobProfiles from '../../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ExportFieldMappingProfiles from '../../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../../support/fragments/topMenu';
import { parseSanityParameters } from '../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();

describe('Data Export', () => {
  before('login', () => {
    cy.setTenant(memberTenant.id);
    cy.getUserToken(user.username, user.password, { log: false });

    cy.allure().logCommandSteps(false);
    cy.login(user.username, user.password, {
      path: TopMenu.settingsPath,
      waiter: SettingsPane.waitLoading,
    });
    cy.allure().logCommandSteps(true);
  });

  it(
    'C380470 Verify that Default Data export profiles are present (firebird)',
    { tags: ['dryRun', 'firebird', 'C380470'] },
    () => {
      ExportJobProfiles.goToJobProfilesTab();
      ExportJobProfiles.verifyDefaultProfiles();
      ExportFieldMappingProfiles.goToFieldMappingProfilesTab();
      ExportFieldMappingProfiles.verifyDefaultProfiles();
    },
  );
});
