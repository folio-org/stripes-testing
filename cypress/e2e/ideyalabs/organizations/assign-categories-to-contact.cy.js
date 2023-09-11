import testTypes from '../../../support/dictionary/testTypes';
import organizations from '../../../support/fragments/organizations/organizations';
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

const addContactPeople = {
  firstName: getRandomStringCode(5),
  lastName: getRandomStringCode(4),
};
const addCategory = 'claim';

describe.skip('ui-organizations: Organizations creation', () => {
  before('Login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  after('Verifying deleted test data', () => {
    organizations.searchByParameters(searchByCode.dropdown, searchByCode.code);
    organizations.checkZeroSearchResultsHeader();
  });

  it(
    'C732 Assign categories to contact person (thunderjet)',
    { tags: [testTypes.ideaLabsTests] },
    () => {
      organizations.searchByParameters(searchByCode.dropdown, searchByCode.code);
      organizations.selectOrganization(newOrganization.name);
      organizations.editOrganization();
      organizations.openContactPeopleSection();
      organizations.selectContact(addContactPeople);
      organizations.editOrganization();
      organizations.selectAndVerifyCategories(addCategory);
    },
  );
});
