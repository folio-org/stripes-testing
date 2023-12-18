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

describe.skip('ui-organizations: Organizations creation', () => {
  before('Login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  after('Verifying deleted test data', () => {
    organizations.searchByParameters(searchByCode.dropdown, searchByCode.code);
    organizations.checkZeroSearchResultsHeader();
  });

  it(
    'C725 Add new contact and assign to an organization record (thunderjet)',
    { tags: ['ideaLabsTests'] },
    () => {
      organizations.searchByParameters(searchByCode.dropdown, searchByCode.code);
      organizations.selectOrganization(newOrganization.name);
      organizations.editOrganization();
      organizations.addNewContact(addContactPeople);
      organizations.closeDetailsPane();
      organizations.addContactToOrganization(addContactPeople);
      organizations.verifySavedContactToOrganization(
        `${addContactPeople.lastName}, ${addContactPeople.firstName}`,
      );
    },
  );
});
