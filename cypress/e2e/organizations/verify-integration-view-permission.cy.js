import permissions from '../../support/dictionary/permissions';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import SettingsOrganizations from '../../support/fragments/settings/organizations/settingsOrganizations';
import getRandomPostfix from '../../support/utils/stringTools';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';

describe('Organizations', () => {
  const organization = {
    name: `autotest_org_${getRandomPostfix()}`,
    status: 'Active',
    code: `test_code_${getRandomPostfix()}`,
    isVendor: true,
    erpCode: `ERP-${getRandomPostfix()}`,
  };

  let user;

  before('Create test data', () => {
    cy.loginAsAdmin({
      path: TopMenu.settingsBankingInformationPath,
      waiter: SettingsOrganizations.waitLoadingOrganizationSettings,
    });
    SettingsOrganizations.checkenableBankingInformationIfNeeded();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
    });

    cy.createTempUser([
      permissions.uiOrganizationsIntegrationUsernamesAndPasswordsView.gui,
      permissions.uiFinanceViewFiscalYear.gui,
    ]).then((userProperties) => {
      user = userProperties;
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it(
    'C423502 Verifying that "Organizations: Integration usernames and passwords: view" permission does not allow user to see "Organizations" records (thunderjet)',
    { tags: ['criticalPath', 'thunderjet'] },
    () => {
      cy.login(user.username, user.password);
      TopMenuNavigation.verifyAppButtonShown('Finance', true);
      TopMenuNavigation.verifyAppButtonShown('Organizations', false);
    },
  );
});
