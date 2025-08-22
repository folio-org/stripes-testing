import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import Organizations from '../../../support/fragments/organizations/organizations';
import permissions from '../../../support/dictionary/permissions';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';

describe('Organizations --> Interface details', () => {
  const organization = {
    ...NewOrganization.defaultUiOrganizations,
    interfaces: [],
  };
  const defaultInterface = { ...NewOrganization.defaultInterface };
  let user;

  before('Create user, organization, and interface', () => {
    cy.getAdminToken();
    Organizations.createInterfaceViaApi(defaultInterface).then((interfaceId) => {
      defaultInterface.id = interfaceId;
      organization.interfaces.push(interfaceId);
    });
    Organizations.createOrganizationViaApi(organization).then((organizationId) => {
      organization.id = organizationId;
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

  it('C1324 Edit interface details (thunderjet)', { tags: ['criticalPath', 'thunderjet'] }, () => {
    Organizations.searchByParameters('Name', organization.name);
    Organizations.selectOrganization(organization.name);
    Organizations.openInterfaceSection();
    Organizations.checkInterfaceIsAdd(defaultInterface);
    Organizations.editOrganization();
    Organizations.selectInterface(defaultInterface);
    Organizations.clickEdit();
    Organizations.addNoteToInterface('Note for interface');
    Organizations.closeEditInterface();
    Organizations.closeWithoutSaving();
    Organizations.clickEdit();
    Organizations.addNoteToInterface('Note for interface');
    Organizations.closeEditInterface();
    Organizations.keepEditingOrganization();
    Organizations.clickSaveButton();
    Organizations.closeInterface();
    Organizations.closeEditOrganizationPane();
    Organizations.checkInterfaceIsAdd(defaultInterface);
    Organizations.checkInterfaceNoteIsAdd('Note for interface');
  });
});
