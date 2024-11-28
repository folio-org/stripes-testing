import permissions from '../../support/dictionary/permissions';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import Users from '../../support/fragments/users/users';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYearDetails';

describe('Organizations', () => {
  const firstOrganization = { ...NewOrganization.defaultUiOrganizations };

  let user;

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(firstOrganization).then((responseOrganizations) => {
      firstOrganization.id = responseOrganizations;
    });
    cy.createTempUser([
      permissions.uiOrganizationsIntegrationUsernamesAndPasswordsView.gui,
      permissions.uiFinanceViewFiscalYear.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password);
    });
  });

  after(() => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(firstOrganization.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C423502 Verifying that "Organizations: Integration usernames and passwords: view" permission does not allow user to see "Organizations" records (thunderjet)',
    { tags: ['extendedPath', 'thunderjet'] },
    () => {
      FiscalYears.varifyExistsFinanceApp();
      Organizations.varifyAbsentOrganizationApp();
    },
  );
});
