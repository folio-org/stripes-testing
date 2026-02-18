import permissions from '../../support/dictionary/permissions';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import OrganizationsSearchAndFilter from '../../support/fragments/organizations/organizationsSearchAndFilter';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Organizations', () => {
  const organization = { ...NewOrganization.defaultUiOrganizations, contacts: [] };
  const contact = { ...NewOrganization.defaultContact };
  const note31Chars = 'More than thirty characters tst';
  const noteMoreThan31Chars = 'More than thirty characters test note to check truncation';
  let user;

  before(() => {
    cy.getAdminToken();
    Organizations.createContactViaApi(contact).then((contactId) => {
      organization.contacts.push(contactId);
      Organizations.createOrganizationViaApi(organization).then((response) => {
        organization.id = response;
      });
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
    'C380639 Edit note (enter more than 30 characters) in "Contact people" list in "Organization" app (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C380639'] },
    () => {
      OrganizationsSearchAndFilter.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.editOrganization();
      Organizations.openContactPeopleSectionInEditCard();
      Organizations.selectContact(contact);
      Organizations.clickEdit();
      Organizations.editNoteInContact(note31Chars);
      Organizations.closeContact();
      Organizations.checkContactInOrganizationEditForm(note31Chars);
      Organizations.selectContact(contact);
      Organizations.clickEdit();
      Organizations.editNoteInContact(noteMoreThan31Chars);
      Organizations.closeContact();
      Organizations.checkContactInOrganizationEditForm(noteMoreThan31Chars);
      Organizations.verifyNoteTruncation(contact, noteMoreThan31Chars);
      Organizations.cancelOrganization();
    },
  );
});
