import TopMenu from '../../support/fragments/topMenu';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Permissions from '../../support/dictionary/permissions';
import Users from '../../support/fragments/users/users';

const testData = {
  user: null,
  organization: {
    ...NewOrganization.defaultUiOrganizations,
  },
  contact: { ...NewOrganization.defaultContact },
};

describe('Organizations: Add new contact and assign to an organization record', () => {
  before('Create user and organization', () => {
    cy.getAdminToken();
    NewOrganization.createViaApi(testData.organization).then((responseOrganization) => {
      testData.organization.id = responseOrganization.id;
    });
    cy.createTempUser([
      Permissions.uiOrganizationsViewEdit.gui,
      Permissions.uiOrganizationsViewEditCreateDeletePrivilegedDonorInformation.gui,
    ]).then((user) => {
      testData.user = user;
      cy.login(user.username, user.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C725 Add new contact and assign to an organization record (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C725'] },
    () => {
      Organizations.searchByParameters('Name', testData.organization.name);
      Organizations.selectOrganization(testData.organization.name);
      Organizations.editOrganization();
      Organizations.addNewContact(testData.contact);
      Organizations.closeContact();
      Organizations.addContactToOrganizationWithoutSaving(testData.contact);
      Organizations.openContactPeopleSection();
      Organizations.checkContactIsAddToContactPeopleSection(testData.contact);
      Organizations.saveOrganization();
      Organizations.openContactPeopleSection();
      Organizations.checkContactIsAddToContactPeopleSection(testData.contact);
    },
  );
});
