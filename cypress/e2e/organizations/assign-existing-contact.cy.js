import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Organizations', () => {
  const contact = { ...NewOrganization.defaultContact };
  const organization = {
    ...NewOrganization.defaultUiOrganizations,
  };
  let user;

  before('Create user, organization, and contact', () => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((organizationId) => {
      organization.id = organizationId;
    });
    Organizations.createContactViaApi(contact).then((contactId) => {
      contact.id = contactId;
    });
    cy.createTempUser([permissions.uiOrganizationsViewEdit.gui]).then((userProperties) => {
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

  it(
    'C676 Assign existing contact to an organization record (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C676'] },
    () => {
      Organizations.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.editOrganization();
      Organizations.addContactToOrganization(contact);
      Organizations.checkContactIsAddToContactPeopleSection(contact);
    },
  );
});
