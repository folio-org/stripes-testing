import { APPLICATION_NAMES } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import Organizations from '../../support/fragments/organizations/organizations';
import OrganizationsSearchAndFilter from '../../support/fragments/organizations/organizationsSearchAndFilter';
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
  };
  const bankingInformation = {
    bankName: `AutoBank_${getRandomPostfix()}`,
    bankAccountNumber: '123456789012',
    transitNumber: '987654321',
    notes: 'Created from Automated test',
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
      bankingInformation.organizationId = response;
      Organizations.createBankingInformationViaApi(bankingInformation);
    });

    cy.createTempUser([
      Permissions.uiOrganizationsAssignAcquisitionUnitsToNewOrganization.gui,
      Permissions.uiOrganizationsIntegrationUsernamesAndPasswordsView.gui,
      Permissions.uiOrganizationsIntegrationUsernamesAndPasswordsViewEdit.gui,
      Permissions.uiOrganizationsInterfaceUsernamesAndPasswordsView.gui,
      Permissions.uiOrganizationsInterfaceUsernamesAndPasswordsViewEditCreateDelete.gui,
      Permissions.uiOrganizationsManageAcquisitionUnits.gui,
      Permissions.uiOrganizationsView.gui,
      Permissions.uiOrganizationsViewAndEditBankingInformation.gui,
      Permissions.uiOrganizationsViewBankingInformation.gui,
      Permissions.uiOrganizationsViewEdit.gui,
      Permissions.uiOrganizationsViewEditAndCreateBankingInformation.gui,
      Permissions.uiOrganizationsViewEditCreate.gui,
      Permissions.uiOrganizationsViewEditCreateAndDeleteBankingInformation.gui,
      Permissions.uiOrganizationsViewEditDelete.gui,
      Permissions.uiSettingsOrganizationsCanViewAndEditSettings.gui,
      Permissions.uiSettingsOrganizationsCanViewOnlySettings.gui,
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
    'C423547 A user can not view banking information when "Enable banking information" setting is not active (thunderjet)',
    { tags: ['criticalPathFlaky', 'thunderjet', 'C423547'] },
    () => {
      OrganizationsSearchAndFilter.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.verifyBankingInformationAccordionIsAbsent();
      Organizations.editOrganization();
      Organizations.verifyBankingInformationAccordionIsAbsent();
    },
  );
});
