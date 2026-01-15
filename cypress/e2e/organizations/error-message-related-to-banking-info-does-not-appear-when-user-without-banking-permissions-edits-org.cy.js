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
  const bankingInformation = {
    bankName: `Test Bank ${Date.now()}`,
    bankAccountNumber: `${getRandomPostfix()}`,
    transitNumber: '987654321',
    notes: 'Test banking information',
  };

  before('Create user and organization with banking information', () => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((orgId) => {
      organization.id = orgId;
      bankingInformation.organizationId = orgId;
      Organizations.createBankingInformationViaApi(bankingInformation);
    });
    cy.createTempUser([Permissions.uiOrganizationsViewEdit.gui]).then((userProperties) => {
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
    'C434070 Error message related to Banking information does not appear when user without Banking permissions edits Organization details (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C434070'] },
    () => {
      Organizations.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.verifyBankingInformationAccordionIsAbsent();
      Organizations.editOrganization();
      Organizations.selectDonorCheckbox();
      Organizations.saveOrganization();
      Organizations.varifySaveOrganizationCalloutMessage(organization);
    },
  );
});
