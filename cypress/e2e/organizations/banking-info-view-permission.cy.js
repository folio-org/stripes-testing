import permissions from '../../support/dictionary/permissions';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import SettingsOrganizations from '../../support/fragments/settings/organizations/settingsOrganizations';
import getRandomPostfix from '../../support/utils/stringTools';
import AuthorizationRoles from '../../support/fragments/settings/authorization-roles/authorizationRoles';
import { CAPABILITY_ACTIONS, CAPABILITY_TYPES } from '../../support/constants';

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
  const capabSetsToAssign = [
    {
      table: CAPABILITY_TYPES.DATA,
      resource: 'UI-Organizations',
      action: CAPABILITY_ACTIONS.VIEW,
    },
    {
      table: CAPABILITY_TYPES.DATA,
      resource: 'UI-Organizations Banking-Information',
      action: CAPABILITY_ACTIONS.VIEW,
    },
  ];
  const newCapabToAssign = {
    table: CAPABILITY_TYPES.DATA,
    resource: 'UI-Organizations',
    action: CAPABILITY_ACTIONS.EDIT,
  };
  let userA;

  before('Create test data', () => {
    cy.loginAsAdmin({
      path: TopMenu.settingsBankingInformationPath,
      waiter: SettingsOrganizations.waitLoadingOrganizationSettings,
    });
    SettingsOrganizations.checkenableBankingInformationIfNeeded();

    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
      bankingInformation.organizationId = response;
      Organizations.createBankingInformationViaApi(bankingInformation);
    });

    cy.createTempUser([
      permissions.uiOrganizationsView.gui,
      permissions.uiOrganizationsViewBankingInformation.gui,
    ]).then((userProperties) => {
      userA = userProperties;
      cy.visit(TopMenu.settingsAuthorizationRoles);
      AuthorizationRoles.clickNewButton();
      AuthorizationRoles.fillRoleNameDescription(userA.username);
      AuthorizationRoles.clickSelectApplication();
      AuthorizationRoles.selectAllApplicationsInModal();
      AuthorizationRoles.clickSaveInModal();
      capabSetsToAssign.forEach((capabSet) => {
        AuthorizationRoles.selectCapabilitySetCheckbox(capabSet);
      });
      AuthorizationRoles.clickSaveButton();
      AuthorizationRoles.clickOnCapabilitySetsAccordion();
      capabSetsToAssign.forEach((capabSet) => {
        AuthorizationRoles.verifyCapabilitySetCheckboxChecked(capabSet);
      });
      AuthorizationRoles.clickAssignUsersButton();
      AuthorizationRoles.selectUserInModal(userA.username);
      AuthorizationRoles.clickSaveInAssignModal();
      cy.wait(4000); // Wait for the changes to propagate
      cy.login(userA.username, userA.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.loginAsAdmin({
      path: TopMenu.settingsAuthorizationRoles,
      waiter: AuthorizationRoles.waitContentLoading,
    });
    Users.deleteViaApi(userA.userId);
    Organizations.deleteOrganizationViaApi(organization.id);
    AuthorizationRoles.searchRole(userA.username);
    AuthorizationRoles.clickOnRoleName(userA.username);
    AuthorizationRoles.clickDeleteRole(userA.username);
    AuthorizationRoles.confirmDeleteRole(userA.username);
  });

  it(
    'C423503 A user can only view banking information with "Organizations: View banking information" permission (thunderjet)',
    { tags: ['criticalPath', 'thunderjet'] },
    () => {
      Organizations.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.verifyBankingInformationAccordionIsPresent();
      Organizations.checkBankInformationExist(bankingInformation.bankName);
      Organizations.checkBankInformationExist(bankingInformation.bankAccountNumber);
      Organizations.checkAvailableActionsInTheActionsField();

      cy.loginAsAdmin({
        path: TopMenu.settingsAuthorizationRoles,
        waiter: AuthorizationRoles.waitContentLoading,
      });
      AuthorizationRoles.searchRole(userA.username);
      AuthorizationRoles.clickOnRoleName(userA.username);
      AuthorizationRoles.openForEdit(userA.username);
      AuthorizationRoles.clickSelectApplication();
      AuthorizationRoles.selectAllApplicationsInModal();
      AuthorizationRoles.clickSaveInModal();
      AuthorizationRoles.selectCapabilitySetCheckbox(newCapabToAssign);
      AuthorizationRoles.clickSaveButton();
      AuthorizationRoles.checkAfterSaveEdit(userA.username);
      AuthorizationRoles.clickOnCapabilitySetsAccordion();
      AuthorizationRoles.verifyCapabilitySetCheckboxChecked(newCapabToAssign);
      cy.wait(4000);

      cy.login(userA.username, userA.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
      });
      Organizations.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.verifyBankingInformationAccordionIsPresent();
      Organizations.editOrganization();
      Organizations.verifyBankingInformationAccordionIsAbsent();
    },
  );
});
