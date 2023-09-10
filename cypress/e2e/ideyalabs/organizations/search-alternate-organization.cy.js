import testTypes from '../../../support/dictionary/testTypes';
import organizations from '../../../support/fragments/organizations/organizations';
import topMenu from '../../../support/fragments/topMenu';
import getRandomStringCode from '../../../support/utils/genereteTextCode';
import getRandomPostfix from '../../../support/utils/stringTools';

const organizationName = `AutoTest_${getRandomPostfix()}`;
const organizationCode = getRandomStringCode(6);

const newOrganization = {
  status: 'Active',
  name: organizationName,
  code: organizationCode,
};

const searchByCode = {
  dropdown: 'Code',
  code: organizationCode,
};

describe.skip('ui-organizations: Organizations creation', () => {
  before('Login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  after('Verifying deleted test data', () => {
    organizations.searchByParameters(searchByCode.dropdown, searchByCode.code);
    organizations.checkZeroSearchResultsHeader();
  });

  it(
    'C677 Search an alternate organization name (thunderjet)',
    { tags: [testTypes.ideaLabsTests] },
    () => {
      cy.visit(topMenu.organizationsPath);
      organizations.createOrganizationViaUi(newOrganization);
      organizations.searchByParameters(searchByCode.dropdown, searchByCode.code);
      organizations.checkOrganizationNameSearchResults(newOrganization.code);
    },
  );
});
