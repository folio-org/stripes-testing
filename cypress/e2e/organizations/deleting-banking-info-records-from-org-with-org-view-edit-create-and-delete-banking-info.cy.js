import { APPLICATION_NAMES } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Organizations', () => {
  let user;
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const firstBankingInformation = {
    bankName: `FirstBankInfo_${getRandomPostfix()}`,
    bankAccountNumber: '1234567890',
    transitNumber: '987654321',
    notes: 'Test banking information',
  };
  const secondBankingInformation = {
    name: `SecondBankInfo_${getRandomPostfix()}`,
    accountNumber: getRandomPostfix(),
  };

  before('Create test data and login', () => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((orgId) => {
      organization.id = orgId;
      firstBankingInformation.organizationId = orgId;
      secondBankingInformation.organizationId = orgId;
      Organizations.createBankingInformationViaApi(firstBankingInformation);
    });
    cy.createTempUser([
      Permissions.uiOrganizationsViewEditCreate.gui,
      Permissions.uiOrganizationsViewEditCreateAndDeleteBankingInformation.gui,
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
    'C423514 Deleting Banking information records from an Organization with "Organizations: View, edit, create and delete banking information" (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C423514'] },
    () => {
      Organizations.searchByParameters('Name', organization.name);
      Organizations.checkSearchResults(organization);
      Organizations.selectOrganization(organization.name);
      Organizations.checkBankInformationExist(firstBankingInformation.bankName);
      Organizations.editOrganization();
      Organizations.addSecondBankingInformation(secondBankingInformation);
      Organizations.checkBankInformationExist(secondBankingInformation.name);
      Organizations.editOrganization();
      Organizations.removeBankingInfoByBankName(firstBankingInformation.bankName);
      Organizations.waitLoading();
      Organizations.checkBankInformationExist(secondBankingInformation.name);
    },
  );
});
