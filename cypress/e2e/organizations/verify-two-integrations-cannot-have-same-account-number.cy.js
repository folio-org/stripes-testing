import permissions from '../../support/dictionary/permissions';
import newOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import IntegrationStates from '../../support/fragments/organizations/integrations/integrationStates';
import getRandomPostfix from '../../support/utils/stringTools';
import TopMenu from '../../support/fragments/topMenu';

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
        paymentMethod: 'EFT',
      },
    ],
  };
  const integrationName = `IntegrationName${getRandomPostfix()}`;
  const integrationDescription = 'Test Integration description';
  const vendorEDICode = getRandomPostfix();
  const libraryEDICode = getRandomPostfix();

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
    });
    cy.createTempUser([permissions.uiOrganizationsViewEditCreate.gui]).then((userProperties) => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(userId);
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it(
    'C350552 Verify if two separate Integrations of one Organization CANNOT contain the same Account number (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C350552'] },
    () => {
      Organizations.searchByParameters('Name', organization.name);
      Organizations.checkSearchResults(organization);
      Organizations.selectOrganization(organization.name);

      Organizations.addIntegration();
      Organizations.fillIntegrationInformationWithoutSchedulingWithDifferentInformation({
        integrationName,
        integrationDescription,
        integrationType: 'Ordering',
        vendorEDICode,
        libraryEDICode,
        sendAccountNumber: true,
        ordersMessageForVendor: true,
        accountNumber: organization.accounts[0].accountNo,
        acquisitionMethod: 'Purchase',
        ediFTP: 'FTP',
        ftpWithoutCredentials: true,
        enableScheduling: true,
      });
      Organizations.saveOrganization();
      InteractorsTools.checkCalloutMessage(IntegrationStates.integrationSaved);
      Organizations.checkIntegrationsAdd(integrationName, integrationDescription);

      Organizations.addIntegration();
      Organizations.fillIntegrationInformationWithoutSchedulingWithDifferentInformation({
        integrationType: 'Ordering',
      });
      Organizations.verifyAccountNumberIsNotAvailableInIntegrationForm(
        organization.accounts[0].accountNo,
      );
    },
  );
});
