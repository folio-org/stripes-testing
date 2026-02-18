import Permissions from '../../support/dictionary/permissions';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import OrganizationsSearchAndFilter from '../../support/fragments/organizations/organizationsSearchAndFilter';
import SettingsOrganizations from '../../support/fragments/settings/organizations/settingsOrganizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Organizations', () => {
  let user;
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const bankingInformation = {
    bankName: `AutoBank_${getRandomPostfix()}`,
    bankAccountNumber: '123456789012',
    transitNumber: '987654321',
    notes: 'Created from Automated test',
  };
  const bankingInformationForEditing = {
    name: `BankInfo_${getRandomPostfix()}`,
    accountNumber: getRandomPostfix(),
  };

  before(() => {
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
      Permissions.uiOrganizationsViewEdit.gui,
      Permissions.uiOrganizationsViewAndEditBankingInformation.gui,
    ]).then((userProperties) => {
      user = userProperties;

      cy.login(user.username, user.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C423504 Viewing and editing "Banking information" record with "Organizations: View and edit banking information" permission (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C423504'] },
    () => {
      OrganizationsSearchAndFilter.searchByParameters('Name', organization.name);
      Organizations.checkSearchResults(organization);
      Organizations.selectOrganization(organization.name);
      Organizations.buttonNewIsAbsent();
      Organizations.checkBankInformationExist(bankingInformation.bankName);
      Organizations.editOrganization();
      Organizations.editBankingInformationName(bankingInformationForEditing.name);
      Organizations.checkBankingInformationAddButtonIsDisabled();
      Organizations.saveOrganization();
      Organizations.checkBankInformationExist(bankingInformationForEditing.name);
    },
  );
});
