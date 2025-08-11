import permissions from '../../support/dictionary/permissions';
import Organizations from '../../support/fragments/organizations/organizations';
import SettingsOrganizations from '../../support/fragments/settings/organizations/settingsOrganizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Organizations', () => {
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

  let user;

  before('Create test data', () => {
    cy.loginAsAdmin({
      path: TopMenu.settingsBankingInformationPath,
      waiter: SettingsOrganizations.waitLoadingOrganizationSettings,
    });
    SettingsOrganizations.uncheckenableBankingInformationIfChecked();

    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
      bankingInformation.organizationId = response;
      Organizations.createBankingInformationViaApi(bankingInformation);
    });

    cy.createTempUser([
      permissions.uiOrganizationsAssignAcquisitionUnitsToNewOrganization.gui,
      permissions.uiOrganizationsIntegrationUsernamesAndPasswordsView.gui,
      permissions.uiOrganizationsIntegrationUsernamesAndPasswordsViewEdit.gui,
      permissions.uiOrganizationsInterfaceUsernamesAndPasswordsView.gui,
      permissions.uiOrganizationsInterfaceUsernamesAndPasswordsViewEditCreateDelete.gui,
      permissions.uiOrganizationsManageAcquisitionUnits.gui,
      permissions.uiOrganizationsView.gui,
      permissions.uiOrganizationsViewAndEditBankingInformation.gui,
      permissions.uiOrganizationsViewBankingInformation.gui,
      permissions.uiOrganizationsViewEdit.gui,
      permissions.uiOrganizationsViewEditAndCreateBankingInformation.gui,
      permissions.uiOrganizationsViewEditCreate.gui,
      permissions.uiOrganizationsViewEditCreateAndDeleteBankingInformation.gui,
      permissions.uiOrganizationsViewEditDelete.gui,
      permissions.uiSettingsOrganizationsCanViewAndEditSettings.gui,
      permissions.uiSettingsOrganizationsCanViewOnlySettings.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C423547 A user can not view banking information when "Enable banking information" setting is not active (thunderjet)',
    { tags: ['criticalPath', 'thunderjet'] },
    () => {
      // Search and select organization
      Organizations.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.verifyBankingInformationAccordionIsAbsent();
      Organizations.editOrganization();
      Organizations.verifyBankingInformationAccordionIsAbsent();
    },
  );
});
