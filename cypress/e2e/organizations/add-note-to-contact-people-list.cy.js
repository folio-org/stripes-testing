import permissions from '../../support/dictionary/permissions';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Organizations', () => {
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const contact = { ...NewOrganization.defaultContact };
  const note = 'Twenty four characters24';
  let user;

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;

      cy.loginAsAdmin({ path: TopMenu.organizationsPath, waiter: Organizations.waitLoading });
      Organizations.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.editOrganization();
      Organizations.addNewContact(contact);
      Organizations.closeContact();
      Organizations.addContactToOrganization(contact);
      Organizations.checkContactIsAddToContactPeopleSection(contact);
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
    'C380642 Add a note to "Contact people" list in "Organization" app (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C380642'] },
    () => {
      Organizations.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.selectContact(contact);
      Organizations.clickEdit();
      Organizations.editNoteInContact(note);
      Organizations.closeContact();
      Organizations.editOrganization();
      Organizations.checkContactInOrganizationEditForm(note);
    },
  );
});
