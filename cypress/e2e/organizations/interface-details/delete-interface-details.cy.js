import TopMenu from '../../../support/fragments/topMenu';
import Organizations from '../../../support/fragments/organizations/organizations';
import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';

describe('Organizations --> Interface details', () => {
  let user;
  const defaultInterface = { ...NewOrganization.defaultInterface };
  const organization = {
    ...NewOrganization.defaultUiOrganizations,
    interfaces: [],
  };

  before('Create user and organization with interface', () => {
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

  it(
    'C1326 Delete interface details (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1326'] },
    () => {
      Organizations.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.checkInterfaceIsAdd(defaultInterface);
      Organizations.editOrganization();
      Organizations.openInterfaceSection();
      Organizations.deleteInterfaceFromEditPage();
      Organizations.cancelOrganization();
      Organizations.closeWithoutSaving();
      Organizations.checkInterfaceIsAdd(defaultInterface);
      Organizations.editOrganization();
      Organizations.openInterfaceSection();
      Organizations.deleteInterfaceFromEditPage();
      Organizations.cancelOrganization();
      Organizations.keepEditingOrganization();
      Organizations.saveOrganization();
      Organizations.openInterfaceSection();
      Organizations.checkInterfaceSectionIsEmpty();
    },
  );
});
