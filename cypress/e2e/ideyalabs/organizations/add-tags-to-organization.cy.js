/* eslint-disable no-undef */
import testTypes from '../../../support/dictionary/testTypes';
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
    'C6710 Add tags to an Organization record (thunderjet)',
    { tags: [testTypes.ideaLabsTests] },
    () => {
      organizations.selectActiveStatus();
      organizations.searchByParameters(searchByCode.dropdown, searchByCode.code);
      organizations.selectOrganization(newOrganization.name);
      organizations.organizationTagDetails();
      organizations.addTag();
      organizations.tagsPane();
      organizations.verifyTagCount();
      organizations.resetFilters();
    },
  );
});
