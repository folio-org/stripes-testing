import devTeams from '../../support/dictionary/devTeams';
import testTypes from '../../support/dictionary/testTypes';
import organizations from '../../support/fragments/organizations/organizations';
import topMenu from '../../support/fragments/topMenu';
import getRandomStringCode from '../../support/utils/genereteTextCode';
import getRandomPostfix from '../../support/utils/stringTools';

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

const organizationStatus = {
  active: 'Active',
  inActive: 'Inactive',
  pending: 'Pending',
};

const addContactPeople = {
  firstName: getRandomStringCode(5),
  lastName: getRandomStringCode(4),
};
const addCategory = 'claim';
const tags = '&';

describe('ui-organizations: Organizations creation', () => {
  before('Login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  after('Verifying deleted test data', () => {
    organizations.searchByParameters(searchByCode.dropdown, searchByCode.code);
    organizations.checkZeroSearchResultsHeader();
  });

  it(
    'C677 Search an alternate organization name (thunderjet)',
    { tags: [testTypes.extendedPath, devTeams.thunderjet] },
    () => {
      cy.visit(topMenu.organizationsPath);
      organizations.createOrganizationViaUi(newOrganization);
      organizations.searchByParameters(
        searchByCode.dropdown,
        searchByCode.code
      );
      organizations.checkOrganizationNameSearchResults(newOrganization.code);
    }
  );

  it(
    'C728 Filter organizations by status (thunderjet)',
    { tags: [testTypes.extendedPath, devTeams.thunderjet] },
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
    }
  );

  it(
    'C730 Make existing organization a Vendor (thunderjet)',
    { tags: [testTypes.extendedPath, devTeams.thunderjet] },
    () => {
      organizations.selectNoInIsVendor();
      organizations.selectOrganization(newOrganization.name);
      organizations.editOrganization();
      organizations.selectVendor();
      organizations.verifyVendorExists();
      organizations.closeDetailsPane();
      organizations.resetFilters();
    }
  );

  it(
    'C725 Add new contact and assign to an organization record (thunderjet)',
    { tags: [testTypes.extendedPath, devTeams.thunderjet] },
    () => {
      organizations.searchByParameters(
        searchByCode.dropdown,
        searchByCode.code
      );
      organizations.selectOrganization(newOrganization.name);
      organizations.editOrganization();
      organizations.addNewContact(addContactPeople);
      organizations.closeDetailsPane();
      organizations.addContactToOrganization(addContactPeople);
      organizations.verifySavedContactToOrganization(
        `${addContactPeople.lastName}, ${addContactPeople.firstName}`
      );
    }
  );

  it(
    'C732 Assign categories to contact person (thunderjet)',
    { tags: [testTypes.extendedPath, devTeams.thunderjet] },
    () => {
      organizations.searchByParameters(
        searchByCode.dropdown,
        searchByCode.code
      );
      organizations.selectOrganization(newOrganization.name);
      organizations.editOrganization();
      organizations.openContactPeopleSection();
      organizations.selectContact(addContactPeople);
      organizations.editOrganization();
      organizations.selectAndVerifyCategories(addCategory);
    }
  );

  it(
    'C729 Delete a contact person (thunderjet)',
    { tags: [testTypes.extendedPath, devTeams.thunderjet] },
    () => {
      organizations.searchByParameters(
        searchByCode.dropdown,
        searchByCode.code
      );
      organizations.selectOrganization(newOrganization.name);
      organizations.editOrganization();
      organizations.openContactPeopleSection();
      organizations.selectContact(addContactPeople);
      organizations.deleteContact();
      organizations.verifyDeletedContact();
      organizations.closeDetailsPane();
    }
  );

  it(
    'C6710 Add tags to an Organization record (thunderjet)',
    { tags: [testTypes.extendedPath, devTeams.thunderjet] },
    () => {
      organizations.selectActiveStatus();
      organizations.searchByParameters(
        searchByCode.dropdown,
        searchByCode.code
      );
      organizations.selectOrganization(newOrganization.name);
      organizations.organizationTagDetails();
      organizations.addTag();
      organizations.tagsPane();
      organizations.verifyTagCount();
      organizations.resetFilters();
    }
  );

  it(
    'C6711 Filter Organizations by tags (thunderjet)',
    { tags: [testTypes.extendedPath, devTeams.thunderjet] },
    () => {
      organizations.tagFilter(tags);
      organizations.checkOrganizationFilter();
      organizations.resetFilters();
    }
  );

  it(
    'C674 Delete existing organization record (thunderjet)',
    { tags: [testTypes.extendedPath, devTeams.thunderjet] },
    () => {
      organizations.searchByParameters(
        searchByCode.dropdown,
        searchByCode.code
      );
      organizations.selectOrganization(newOrganization.name);
      organizations.deleteOrganization();
    }
  );
});
