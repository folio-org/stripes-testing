import organizations from '../../support/fragments/organizations/organizations';
import topMenu from '../../support/fragments/topMenu';

const testdata = {
  status: 'Active',
  name: 'test Organization2',
  code: 'testCode2',
};
const searchByCode = {
  dropdown: 'Code',
  code: 'testCode2',
};
const organizationStatus = {
  active: 'Active',
  inActive: 'Inactive',
  pending: 'Pending'
};

const addContactPeople = { firstName: 'test', lastName: 'orgsantosh' };
const addCategory = 'claim';
const tags = '&';


describe('Organzation App', () => {
  before('login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  it('C677, Search an alternate organization name', () => {
    cy.visit(topMenu.organizationsPath);
    organizations.createOrganizationViaUi(testdata);
    organizations.searchByParameters(searchByCode.dropdown, searchByCode.code);
    organizations.checkOrganizationNameSearchResults(testdata.code);
  });
  it('C728, Filter organizations by status', () => {
    organizations.selectActiveStatus();
    organizations.checkSearchResults({ name: organizationStatus.active });
    organizations.resetAll();
    organizations.selectInActiveStatus();
    organizations.checkSearchResults({ name: organizationStatus.inActive });
    organizations.resetAll();
    organizations.selectPendingStatus();
    organizations.checkZeroSearchResultsHeader({ name: organizationStatus.pending }); // as we dont have any pending status shows zero records
    organizations.resetAll();
  });
  it('C730, Make existing organization a Vendor', () => {
    organizations.selectNoInIsVendor();
    organizations.selectOrganization(testdata.name);
    organizations.editOrganization();
    organizations.selectVendor();
    organizations.closeDetailsPane();
  });
  it('C725, Add new contact and assign to an organization record', () => {
    organizations.resetAll();
    organizations.searchByParameters(searchByCode.dropdown, searchByCode.code);
    organizations.selectOrganization(testdata.name);
    organizations.editOrganization();
    organizations.addNewContact(addContactPeople);
    cy.wait(2000);
    organizations.closeDetailsPane();
    cy.wait(4000);
    organizations.addContactToOrganization(addContactPeople);
  });

  it('C732, Assign categories to contact person', () => {
    organizations.searchByParameters(searchByCode.dropdown, searchByCode.code);
    organizations.selectOrganization(testdata.name);
    organizations.editOrganization();
    organizations.openContactPeopleSection();
    organizations.selectContact(addContactPeople);
    organizations.editOrganization();
    organizations.selectCategories(addCategory);
    cy.wait(2000);
    organizations.closeDetailsPane(); // closing edit Organization pane
  });
  it('C729, Delete a contact person', () => {
    organizations.searchByParameters(searchByCode.dropdown, searchByCode.code);
    organizations.selectOrganization(testdata.name);
    organizations.editOrganization();
    organizations.openContactPeopleSection();
    organizations.selectContact(addContactPeople);
    organizations.deleteContact();
    cy.wait(2000);
    organizations.closeDetailsPane(); // closing edit Organization pane
  });

  it('C6710, Add tags to an Organization record', () => {
    organizations.selectActiveStatus();
    organizations.searchByParameters(searchByCode.dropdown, searchByCode.code);
    organizations.selectOrganization(testdata.name);
    organizations.organizationTagDetails();
    organizations.addTag(),
    organizations.verifyTagCount();
    organizations.resetAll();
  });
  it('C6711, Filter Organizations by tags', () => {
    organizations.tagFilter(tags);
  });
  it('C674, Delete existing organization record', () => {
    organizations.searchByParameters(searchByCode.dropdown, searchByCode.code);
    organizations.selectOrganization(testdata.name);
    organizations.deleteOrganization();
    organizations.searchByParameters(searchByCode.dropdown, searchByCode.code);
    organizations.checkZeroSearchResultsHeader();
  });
});

