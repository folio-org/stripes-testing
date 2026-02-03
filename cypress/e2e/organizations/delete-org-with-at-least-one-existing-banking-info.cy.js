import { APPLICATION_NAMES } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import ConfirmDeleteOrganizationModal from '../../support/fragments/organizations/modals/confirmDeleteOrganizationModal';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Organizations', () => {
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const bankingInformation = {
    bankName: `Bank_${getRandomPostfix()}`,
    bankAccountNumber: `${getRandomPostfix()}`,
    transitNumber: '000111222',
    notes: 'Created from automated test',
  };
  let user;

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((orgId) => {
      organization.id = orgId;
      bankingInformation.organizationId = orgId;
      Organizations.createBankingInformationViaApi(bankingInformation);
    });

    cy.createTempUser([
      Permissions.uiOrganizationsViewEditDelete.gui,
      Permissions.uiOrganizationsViewEditCreateAndDeleteBankingInformation.gui,
    ]).then((userProperties) => {
      user = userProperties;

      cy.login(user.username, user.password);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORGANIZATIONS);
      Organizations.waitLoading();
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C613152 Delete organization with at least one existing Banking information (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C613152'] },
    () => {
      Organizations.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.verifyBankingInformationAccordionIsPresent();
      Organizations.checkBankInformationExist(bankingInformation.bankName);
      Organizations.deleteOrganization(false);
      ConfirmDeleteOrganizationModal.waitLoading();
      ConfirmDeleteOrganizationModal.verifyModalView(organization.name);
      ConfirmDeleteOrganizationModal.clickCancel();
      ConfirmDeleteOrganizationModal.isNotDisplayed();
      Organizations.deleteOrganization(false);
      ConfirmDeleteOrganizationModal.waitLoading();
      ConfirmDeleteOrganizationModal.verifyModalView(organization.name);
      ConfirmDeleteOrganizationModal.clickDeleteButton();
      InteractorsTools.checkCalloutMessage(
        `The organization ${organization.name} was successfully deleted`,
      );
      Organizations.checkZeroSearchResultsHeader(organization.name);
    },
  );
});
