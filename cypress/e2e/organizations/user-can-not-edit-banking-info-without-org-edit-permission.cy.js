import { APPLICATION_NAMES } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import SettingsOrganizations from '../../support/fragments/settings/organizations/settingsOrganizations';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';

describe('Organizations', () => {
  let user;
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const bankingInformation = {
    bankName: `Test Bank ${Date.now()}`,
    bankAccountNumber: '1234567890',
    transitNumber: '987654321',
    notes: 'Test banking information',
  };

  before('Create user and organization with banking information', () => {
    cy.getAdminToken();
    SettingsOrganizations.getBankingInformationStatusViaApi().then((response) => {
      if (response.settings[0].value === 'false') {
        response.settings[0].value = true;
        SettingsOrganizations.enableBankingInformationViaApi(response);
      }
    });
    Organizations.createOrganizationViaApi(organization).then((orgId) => {
      organization.id = orgId;
      bankingInformation.organizationId = orgId;
      Organizations.createBankingInformationViaApi(bankingInformation);
    });

    cy.createTempUser([
      Permissions.uiOrganizationsView.gui,
      Permissions.uiOrganizationsViewAndEditBankingInformation.gui,
    ]).then((userProperties) => {
      user = userProperties;

      cy.login(user.username, user.password);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORGANIZATIONS);
      Organizations.waitLoading();
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C423518 A user cannot edit banking information without organization edit permission (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C423518'] },
    () => {
      Organizations.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.verifyBankingInformationAccordionIsPresent();
      Organizations.checkAvailableActionsInTheActionsField();
    },
  );
});
