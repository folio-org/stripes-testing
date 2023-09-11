import TopMenu from '../../support/fragments/topMenu';
import permissions from '../../support/dictionary/permissions';
import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import Users from '../../support/fragments/users/users';
import newOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import InteractorsTools from '../../support/utils/interactorsTools';
import devTeams from '../../support/dictionary/devTeams';

describe('ui-organizations: EDI convention in Organization Integration', () => {
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
        paymentMethod: 'Internal Transfer',
      },
    ],
  };
  const integrationName1 = `FirstIntegrationName${getRandomPostfix()}`;
  const integrationName2 = `SecondIntegrationName${getRandomPostfix()}`;
  const integartionDescription1 = 'Test Integation descripton1';
  const integartionDescription2 = 'Test Integation descripton2';
  const vendorEDICodeFor1Integration = getRandomPostfix();
  const libraryEDICodeFor1Integration = getRandomPostfix();
  const vendorEDICodeFor2Integration = getRandomPostfix();
  const libraryEDICodeFor2Integration = getRandomPostfix();

  before(() => {
    cy.createTempUser([permissions.uiOrganizationsViewEditCreate.gui]).then((userProperties) => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password);
    });
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
    });
    cy.visit(TopMenu.organizationsPath);
  });

  after(() => {
    Users.deleteViaApi(userId);
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it(
    'C350762: User can Create and Edit Integrations for an Organization-Vendor (thunderjet)',
    { tags: [TestTypes.smoke, devTeams.thunderjet] },
    () => {
      // Found and edit created organization
      Organizations.searchByParameters('Name', organization.name);
      Organizations.checkSearchResults(organization);
      Organizations.selectOrganization(organization.name);
      // Add first integration and check this
      Organizations.addIntegration();
      Organizations.fillIntegrationInformationWithoutScheduling(
        integrationName1,
        integartionDescription1,
        vendorEDICodeFor1Integration,
        libraryEDICodeFor1Integration,
        organization.accounts[0].accountNo,
        'Purchase',
      );
      InteractorsTools.checkCalloutMessage('Integration was saved');
      Organizations.checkIntegrationsAdd(integrationName1, integartionDescription1);
      // Add second inegration and check all
      Organizations.addIntegration();
      cy.wait(2000);
      Organizations.fillIntegrationInformationWithoutScheduling(
        integrationName2,
        integartionDescription2,
        vendorEDICodeFor2Integration,
        libraryEDICodeFor2Integration,
        organization.accounts[1].accountNo,
        'Purchase At Vendor System',
      );
      InteractorsTools.checkCalloutMessage('Integration was saved');
      Organizations.checkTwoIntegationsAdd(
        integrationName1,
        integartionDescription1,
        integrationName2,
        integartionDescription2,
      );
    },
  );
});
