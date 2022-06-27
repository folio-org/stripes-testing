import TopMenu from '../../support/fragments/topMenu';
import permissions from '../../support/dictionary/permissions';
import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import users from '../../support/fragments/users/users';
import newOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import InteractorsTools from '../../support/utils/interactorsTools';


describe('ui-organizations: EDI convention in Organization Integration', () => {
  let userId = '';
  const organization = {
    ...newOrganization.defaultUiOrganizations,
    accounts: [{
      accountNo: '1234',
      accountStatus: 'Active',
      acqUnitIds: [],
      appSystemNo: '',
      contactInfo: 'customerservice@alexanderstreet.com',
      description: 'Main library account',
      libraryCode: 'COB',
      libraryEdiCode: `${getRandomPostfix()}`,
      name: 'Library account',
      notes: '',
      paymentMethod: 'Physical Check',
    }]
  };

  beforeEach(() => {
    cy.createTempUser([permissions.OrganizationviewCreateEdit.gui])
      .then(userProperties => {
        userId = userProperties.userId;
        cy.login(userProperties.username, userProperties.password);
      });
    Organizations.createOrganizationApi(organization)
      .then(response => {
        organization.id = response;
      });
    cy.visit(TopMenu.organizationsPath);
  });

  afterEach(() => {
    users.deleteViaApi(userId);
    Organizations.deleteOrganizationApi(organization.id);
  });

  it('C350758: Verify if a User can set/edit EDI convention in Organization Integration', { tags: [TestTypes.smoke] }, () => {
    // Find created Organization
    Organizations.searchByParameters('Name', organization.name);
    Organizations.checkSearchResults(organization);
    Organizations.chooseOrganizationFromList(organization);

    Organizations.addIntegration();
    Organizations.fillIntegrationInformation();
    InteractorsTools.checkCalloutMessage('Integration was saved');

    Organizations.selectIntegration();
    Organizations.editIntegrationInformation();
    InteractorsTools.checkCalloutMessage('Integration was saved');
  });
});
