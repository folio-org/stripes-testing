import permissions from '../../support/dictionary/permissions';
import Organizations from '../../support/fragments/organizations/organizations';
import SettingsOrganizations from '../../support/fragments/settings/organizations/settingsOrganizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import AuthorizationRoles from '../../support/fragments/settings/authorization-roles/authorizationRoles';
import { CAPABILITY_ACTIONS, CAPABILITY_TYPES } from '../../support/constants';

describe('Organizations', () => {
  const organization = {
    name: `autotest_org_${getRandomPostfix()}`,
    status: 'Active',
    code: `autotest_code_${getRandomPostfix()}`,
    isVendor: true,
    erpCode: `ERP-${getRandomPostfix()}`,
  };
  const bankingInformation = {
    name: `BankInfo_${getRandomPostfix()}`,
    accountNumber: getRandomPostfix(),
  };
  const capabSetsToAssign = {
    table: CAPABILITY_TYPES.DATA,
    resource: 'UI-Organizations',
    action: CAPABILITY_ACTIONS.CREATE,
  };

  const newCapabToAssign = {
    table: CAPABILITY_TYPES.DATA,
    resource: 'UI-Organizations',
    action: CAPABILITY_ACTIONS.DELETE,
  };
  let userA;

  before(() => {
    cy.getAdminToken();
    cy.loginAsAdmin({
      path: TopMenu.settingsBankingInformationPath,
      waiter: SettingsOrganizations.waitLoadingOrganizationSettings,
    });
    SettingsOrganizations.selectBankingInformation();
    SettingsOrganizations.enableBankingInformation();

    Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
      organization.id = responseOrganizations;
      cy.loginAsAdmin({ path: TopMenu.organizationsPath, waiter: Organizations.waitLoading });
      Organizations.searchByParameters('Name', organization.name);
      Organizations.checkSearchResults(organization);
      Organizations.selectOrganization(organization.name);
      Organizations.editOrganization();
      Organizations.addBankingInformation(bankingInformation);
      Organizations.closeDetailsPane();
    });
    cy.createTempUser([permissions.uiOrganizationsViewEditCreate.gui]).then((userProperties) => {
      userA = userProperties;
      cy.visit(TopMenu.settingsAuthorizationRoles);
      AuthorizationRoles.clickNewButton();
      AuthorizationRoles.fillRoleNameDescription(userA.username);
      AuthorizationRoles.clickSelectApplication();
      AuthorizationRoles.selectAllApplicationsInModal();
      AuthorizationRoles.clickSaveInModal();
      AuthorizationRoles.selectCapabilitySetCheckbox(capabSetsToAssign);
      AuthorizationRoles.clickSaveButton();
      AuthorizationRoles.clickOnCapabilitySetsAccordion();
      AuthorizationRoles.verifyCapabilitySetCheckboxChecked(capabSetsToAssign);
      AuthorizationRoles.clickAssignUsersButton();
      AuthorizationRoles.selectUserInModal(userA.username);
      AuthorizationRoles.clickSaveInAssignModal();
      cy.login(userA.username, userA.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    cy.loginAsAdmin({ path: TopMenu.organizationsPath, waiter: Organizations.waitLoading });
    Organizations.searchByParameters('Name', organization.name);
    Organizations.checkSearchResults(organization);
    Organizations.selectOrganization(organization.name);
    Organizations.editOrganization();
    Organizations.deleteBankingInformation();
    Organizations.closeDetailsPane();
    Organizations.deleteOrganizationViaApi(organization.id);

    cy.visit(TopMenu.settingsBankingInformationPath);
    SettingsOrganizations.selectBankingInformation();
    SettingsOrganizations.enableBankingInformation();

    Users.deleteViaApi(userA.userId);
  });

  it(
    'C423516 User cannot view banking information without banking information permission (thunderjet)',
    { tags: ['criticalPath', 'thunderjet'] },
    () => {
      Organizations.searchByParameters('Name', organization.name);
      Organizations.checkSearchResults(organization);
      Organizations.selectOrganization(organization.name);
      Organizations.editOrganization();
      Organizations.verifyBankingInformationAccordionIsAbsent();

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
      AuthorizationRoles.selectCapabilitySetCheckbox(capabSetsToAssign, false);
      AuthorizationRoles.verifyCapabilityCheckboxUncheckedAndEnabled(capabSetsToAssign);
      AuthorizationRoles.selectCapabilitySetCheckbox(newCapabToAssign);
      AuthorizationRoles.clickSaveButton();
      AuthorizationRoles.checkAfterSaveEdit(userA.username);
      AuthorizationRoles.clickOnCapabilitySetsAccordion();
      AuthorizationRoles.verifyCapabilitySetCheckboxChecked(newCapabToAssign);

      cy.login(userA.username, userA.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
      });
      Organizations.searchByParameters('Name', organization.name);
      Organizations.checkSearchResults(organization);
      Organizations.selectOrganization(organization.name);
      Organizations.editOrganization();
      Organizations.verifyBankingInformationAccordionIsAbsent();
      Organizations.cancelOrganization();
      Organizations.verifyBankingInformationAccordionIsAbsent();
    },
  );
});
