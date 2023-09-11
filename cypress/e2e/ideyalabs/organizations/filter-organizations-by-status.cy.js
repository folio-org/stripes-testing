import testTypes from '../../../support/dictionary/testTypes';
import organizations from '../../../support/fragments/organizations/organizations';
import getRandomStringCode from '../../../support/utils/genereteTextCode';

const organizationCode = getRandomStringCode(6);

const searchByCode = {
  dropdown: 'Code',
  code: organizationCode,
};

const organizationStatus = {
  active: 'Active',
  inActive: 'Inactive',
  pending: 'Pending',
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
    'C728 Filter organizations by status (thunderjet)',
    { tags: [testTypes.ideaLabsTests] },
    () => {
      organizations.selectActiveStatus();
      organizations.checkSearchResults({ name: organizationStatus.active });
      organizations.resetFilters();
      organizations.selectInActiveStatus();
      organizations.checkSearchResults({ name: organizationStatus.inActive });
      organizations.resetFilters();
      organizations.selectPendingStatus();
      organizations.checkZeroSearchResultsHeader({
        name: organizationStatus.pending,
      });
      organizations.resetFilters();
      organizations.verifyResetFilters();
    },
  );
});
