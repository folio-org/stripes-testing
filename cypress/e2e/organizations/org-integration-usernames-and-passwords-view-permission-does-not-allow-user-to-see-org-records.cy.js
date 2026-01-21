import Permissions from '../../support/dictionary/permissions';
import Organizations from '../../support/fragments/organizations/organizations';
import SettingsOrganizations from '../../support/fragments/settings/organizations/settingsOrganizations';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Organizations', () => {
  let user;
  const organization = {
    name: `autotest_org_${getRandomPostfix()}`,
    status: 'Active',
    code: `test_code_${getRandomPostfix()}`,
    isVendor: true,
    erpCode: `ERP-${getRandomPostfix()}`,
  };

  before('Create test data', () => {
    cy.getAdminToken();
    SettingsOrganizations.getBankingInformationStatusViaApi().then((response) => {
      if (response.settings[0].value === 'true') {
        response.settings[0].value = 'false';
        SettingsOrganizations.enableBankingInformationViaApi(response);
      }
    });
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
    });

    cy.createTempUser([
      Permissions.uiOrganizationsIntegrationUsernamesAndPasswordsView.gui,
      Permissions.uiFinanceViewFiscalYear.gui,
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
    { tags: ['criticalPath', 'thunderjet', 'C423502'] },
    () => {
      cy.login(user.username, user.password);
      TopMenuNavigation.verifyAppButtonShown('Finance', true);
      TopMenuNavigation.verifyAppButtonShown('Organizations', false);
    },
  );
});
