import testTypes from '../../../support/dictionary/testTypes';
import organizations from '../../../support/fragments/organizations/organizations';
import getRandomStringCode from '../../../support/utils/genereteTextCode';

const organizationCode = getRandomStringCode(6);

const searchByCode = {
  dropdown: 'Code',
  code: organizationCode,
};

const tags = '&';

describe.skip('ui-organizations: Organizations creation', () => {
  before('Login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  after('Verifying deleted test data', () => {
    organizations.searchByParameters(searchByCode.dropdown, searchByCode.code);
    organizations.checkZeroSearchResultsHeader();
  });

  it('C6711 Filter Organizations by tags (thunderjet)', { tags: [testTypes.ideaLabsTests] }, () => {
    organizations.tagFilter(tags);
    organizations.checkOrganizationFilter();
    organizations.resetFilters();
  });
});
