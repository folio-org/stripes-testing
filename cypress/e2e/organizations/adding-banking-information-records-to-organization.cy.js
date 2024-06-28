import permissions from '../../support/dictionary/permissions';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import BankingInformation from '../../support/fragments/settings/organizations/bankingInformation';

describe('Organizations', () => {
  const firstOrganization = { ...NewOrganization.defaultUiOrganizations };

  const firstBankingInformation = {
    name: `BankInfo_${getRandomPostfix()}`,
    accountNumber: getRandomPostfix(),
  };

  let user;
  let C423432User;

  before(() => {
    cy.getAdminToken();
    BankingInformation.setBankingInformationValue(true);
    Organizations.createOrganizationViaApi(firstOrganization).then((responseOrganizations) => {
      firstOrganization.id = responseOrganizations;
    });
    cy.createTempUser([
      permissions.uiOrdersView.gui,
      permissions.uiOrganizationsViewBankingInformation.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    cy.loginAsAdmin({ path: TopMenu.organizationsPath, waiter: Organizations.waitLoading });
    Organizations.searchByParameters('Name', firstOrganization.name);
    Organizations.checkSearchResults(firstOrganization);
    Organizations.selectOrganization(firstOrganization.name);
    Organizations.editOrganization();
    Organizations.deleteBankingInformation();
    Organizations.closeDetailsPane();
    Organizations.resetFilters();
    Organizations.deleteOrganizationViaApi(firstOrganization.id);
    BankingInformation.setBankingInformationValue(false);
    Users.deleteViaApi(user.userId);
    Users.deleteViaApi(C423432User.userId);
  });

  it(
    'C423513: Adding Banking information records to an Organization with "Organizations: View, edit and create banking information" (thunderjet)',
    { tags: ['extendedPath', 'thunderjet'] },
    () => {
      Organizations.searchByParameters('Name', firstOrganization.name);
      Organizations.checkSearchResults(firstOrganization);
      Organizations.selectOrganization(firstOrganization.name);
      Organizations.editOrganization();
      Organizations.addBankingInformation(firstBankingInformation);
      Organizations.closeDetailsPane();
      Organizations.resetFilters();
    },
  );
});
