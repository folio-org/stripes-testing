import TopMenu from '../../support/fragments/topMenu';
import Organizations from '../../support/fragments/organizations/organizations';
import Permissions from '../../support/dictionary/permissions';
import Users from '../../support/fragments/users/users';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import OrganizationsSearchAndFilter from '../../support/fragments/organizations/organizationsSearchAndFilter';

describe('Organizations', () => {
  const organization = {
    ...NewOrganization.defaultUiOrganizations,
    contacts: [],
  };
  const contact = { ...NewOrganization.defaultContact };
  let user;

  before('Create user, organization, and contact', () => {
    cy.getAdminToken();
    Organizations.createContactViaApi(contact).then((contactId) => {
      contact.id = contactId;
      organization.contacts.push(contactId);
      Organizations.createOrganizationViaApi(organization).then((orgId) => {
        organization.id = orgId;
      });
    });
    cy.createTempUser([Permissions.uiOrganizationsViewEdit.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(user.userId);
  });

  it('C729 Delete a contact person (thunderjet)', { tags: ['extendedPath', 'thunderjet'] }, () => {
    OrganizationsSearchAndFilter.searchByParameters('Name', organization.name);
    Organizations.selectOrganization(organization.name);
    Organizations.editOrganization();
    Organizations.openContactPeopleSectionInEditCard();
    Organizations.deleteContactFromContactPeople();
    Organizations.saveOrganization();
    Organizations.verifySaveCalloutMessage(organization);
    Organizations.openContactPeopleSection();
    Organizations.checkContactSectionIsEmpty();
  });
});
