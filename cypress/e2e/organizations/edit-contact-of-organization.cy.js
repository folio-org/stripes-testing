import permissions from '../../support/dictionary/permissions';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import OrganizationsSearchAndFilter from '../../support/fragments/organizations/organizationsSearchAndFilter';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Organizations', () => {
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const contact = { ...NewOrganization.defaultContact };
  let user;

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
    });
    cy.createTempUser([permissions.uiOrganizationsViewEditCreate.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it(
    'C726 Edit contact from an organization record (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C726'] },
    () => {
      OrganizationsSearchAndFilter.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.editOrganization();
      Organizations.addNewContact(contact);
      Organizations.closeContact();
      Organizations.addContactToOrganization(contact);
      Organizations.checkContactIsAddToContactPeopleSection(contact);
      Organizations.selectContact(contact);
      Organizations.clickEdit();
      Organizations.editFirstAndLastNameInContact(contact);
      Organizations.closeContact();
      contact.lastName = `${contact.lastName}-edited`;
      contact.firstName = `${contact.firstName}-edited`;
      Organizations.checkContactIsAddToContactPeopleSection(contact);
    },
  );
});
