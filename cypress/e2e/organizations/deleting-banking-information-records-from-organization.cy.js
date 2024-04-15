import permissions from '../../support/dictionary/permissions';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Organizations', () => {
  const firstOrganization = { ...NewOrganization.defaultUiOrganizations };
  const secondBankingInformation = {
    name: `SecondBankInfo_${getRandomPostfix()}`,
    accountNumber: getRandomPostfix(),
  };
  const firstBankingInformation = {
    name: `FirstBankInfo_${getRandomPostfix()}`,
    accountNumber: getRandomPostfix(),
  };
  let C423504User;

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(firstOrganization).then((responseOrganizations) => {
      firstOrganization.id = responseOrganizations;
      cy.loginAsAdmin({ path: TopMenu.organizationsPath, waiter: Organizations.waitLoading });
      Organizations.searchByParameters('Name', firstOrganization.name);
      Organizations.checkSearchResults(firstOrganization);
      Organizations.selectOrganization(firstOrganization.name);
      Organizations.editOrganization();
      Organizations.addBankingInformation(firstBankingInformation);
      Organizations.closeDetailsPane();
      Organizations.resetFilters();
    });
    cy.createTempUser([
      permissions.uiOrganizationsViewEditCreate.gui,
      permissions.uiOrganizationsViewEditCreateAndDeleteBankingInformation.gui,
    ]).then((secondUserProperties) => {
      C423504User = secondUserProperties;
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
    Users.deleteViaApi(C423504User.userId);
  });

  it(
    'C42351 Deleting Banking information records from an Organization with "Organizations: View, edit, create and delete banking information" (thunderjet)',
    { tags: ['criticalPath', 'thunderjet'] },
    () => {
      cy.login(C423504User.username, C423504User.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
      });
      Organizations.searchByParameters('Name', firstOrganization.name);
      Organizations.checkSearchResults(firstOrganization);
      Organizations.selectOrganization(firstOrganization.name);
      Organizations.checkBankInformationExist(firstBankingInformation.name);
      Organizations.editOrganization();
      Organizations.addSecondBankingInformation(secondBankingInformation);
      Organizations.checkBankInformationExist(secondBankingInformation.name);
      Organizations.editOrganization();
      Organizations.deleteBankingInformation();
      Organizations.checkBankInformationExist(secondBankingInformation.name);
    },
  );
});
