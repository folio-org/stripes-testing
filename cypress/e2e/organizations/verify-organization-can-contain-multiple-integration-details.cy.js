import permissions from '../../support/dictionary/permissions';
import newOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';
import TopMenu from '../../support/fragments/topMenu';
import OrganizationsSearchAndFilter from '../../support/fragments/organizations/organizationsSearchAndFilter';

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
      {
        accountNo: getRandomPostfix(),
        accountStatus: 'Active',
        acqUnitIds: [],
        appSystemNo: '',
        description: 'Libraries',
        libraryCode: 'COB',
        libraryEdiCode: getRandomPostfix(),
        name: 'TestAccout2',
        notes: '',
        paymentMethod: 'EFT',
      },
    ],
  };
  const integrationName1 = `FirstIntegrationName${getRandomPostfix()}`;
  const integrationName2 = `SecondIntegrationName${getRandomPostfix()}`;
  const integrationDescription1 = 'Test Integration description1';
  const integrationDescription2 = 'Test Integration description2';
  const vendorEDICodeFor1Integration = getRandomPostfix();
  const libraryEDICodeFor1Integration = getRandomPostfix();
  const vendorEDICodeFor2Integration = getRandomPostfix();
  const libraryEDICodeFor2Integration = getRandomPostfix();

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
    'C350551 Verify if an Organization record can contain multiple "Integration details" configurations (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C350551'] },
    () => {
      OrganizationsSearchAndFilter.searchByParameters('Name', organization.name);
      Organizations.checkSearchResults(organization);
      Organizations.selectOrganization(organization.name);

      Organizations.addIntegration();
      Organizations.fillIntegrationInformationWithoutSchedulingWithDifferentInformation({
        integrationName: integrationName1,
        integrationDescription: integrationDescription1,
        integrationType: 'Ordering',
        vendorEDICode: vendorEDICodeFor1Integration,
        libraryEDICode: libraryEDICodeFor1Integration,
        sendAccountNumber: true,
        ordersMessageForVendor: true,
        accountNumber: organization.accounts[0].accountNo,
        acquisitionMethod: 'Purchase',
        ediFTP: 'FTP',
        ftpWithoutCredentials: true,
        enableScheduling: true,
      });
      Organizations.saveOrganization();
      InteractorsTools.checkCalloutMessage('Integration was saved');
      Organizations.checkIntegrationsAdd(integrationName1, integrationDescription1);

      Organizations.addIntegration();
      cy.wait(2000);
      Organizations.fillIntegrationInformationWithoutSchedulingWithDifferentInformation({
        integrationName: integrationName2,
        integrationDescription: integrationDescription2,
        integrationType: 'Ordering',
        vendorEDICode: vendorEDICodeFor2Integration,
        libraryEDICode: libraryEDICodeFor2Integration,
        sendAccountNumber: true,
        ordersMessageForVendor: true,
        accountNumber: organization.accounts[1].accountNo,
        acquisitionMethod: 'Purchase At Vendor System',
        ediFTP: 'FTP',
        ftpWithoutCredentials: true,
        enableScheduling: true,
      });
      Organizations.saveOrganization();
      InteractorsTools.checkCalloutMessage('Integration was saved');
      Organizations.checkTwoIntegationsAdd(
        integrationName1,
        integrationDescription1,
        integrationName2,
        integrationDescription2,
      );
    },
  );
});
