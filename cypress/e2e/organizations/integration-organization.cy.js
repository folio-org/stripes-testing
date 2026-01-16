import permissions from '../../support/dictionary/permissions';
import newOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';

describe('Organizations', () => {
  let userId;
  const organization = {
    ...newOrganization.defaultUiOrganizations,
    accounts: [
      {
        accountNo: getRandomPostfix(),
        accountStatus: 'Active',
        acqUnitIds: [],
        appSystemNo: '',
        description: 'Main library account',
        libraryCode: 'COB',
        libraryEdiCode: getRandomPostfix(),
        name: 'TestAccout1',
        notes: '',
        paymentMethod: 'Cash',
      },
    ],
  };
  const integrationName = `FirstIntegrationName${getRandomPostfix()}`;
  const integartionDescription = 'Test Integation descripton1';
  const vendorEDICodeFor1Integration = getRandomPostfix();
  const libraryEDICodeFor1Integration = getRandomPostfix();

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
    });
    cy.createTempUser([permissions.uiOrganizationsViewEditCreate.gui]).then((userProperties) => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password);
    });
    TopMenuNavigation.navigateToApp('Organizations');
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(userId);
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it(
    'C350758 Verify if a User can not set and edit EDI convention in Organization Integration (thunderjet)',
    { tags: ['smoke', 'thunderjet', 'C350758', 'shiftLeft'] },
    () => {
      Organizations.searchByParameters('Name', organization.name);
      Organizations.checkSearchResults(organization);
      Organizations.selectOrganization(organization.name);

      Organizations.addIntegration();
      Organizations.fillIntegrationInformationWithoutScheduling(
        integrationName,
        integartionDescription,
        vendorEDICodeFor1Integration,
        libraryEDICodeFor1Integration,
        organization.accounts[0].accountNo,
        'Purchase',
      );
      InteractorsTools.checkCalloutMessage('Integration was saved');

      Organizations.selectIntegration(integrationName);
      Organizations.editIntegrationInformation();
      InteractorsTools.checkCalloutMessage('Integration was saved');
      Organizations.closeIntegrationDetailsPane();
    },
  );
});
