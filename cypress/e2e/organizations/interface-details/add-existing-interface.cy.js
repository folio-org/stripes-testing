import permissions from '../../../support/dictionary/permissions';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import OrganizationsSearchAndFilter from '../../../support/fragments/organizations/organizationsSearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Organizations --> Interface details', () => {
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const defaultInterface = { ...NewOrganization.defaultInterface };
  let user;

  before('Create user, organization, and interface', () => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((organizationId) => {
      organization.id = organizationId;
    });
    Organizations.createInterfaceViaApi(defaultInterface).then((interfaceId) => {
      defaultInterface.id = interfaceId;
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
    'C1322 Add an existing interface to an Organization record (thunderjet)',
    { tags: ['extendedPath', 'thunderjet'] },
    () => {
      OrganizationsSearchAndFilter.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.openInterfaceSection();
      Organizations.checkInterfaceSectionIsEmpty();
      Organizations.editOrganization();
      Organizations.addIntrefaceToOrganizationAndClickClose(defaultInterface);
      Organizations.openInterfaceSection();
      Organizations.addIntrefaceToOrganization(defaultInterface);
      Organizations.openInterfaceSection();
      Organizations.checkInterfaceIsAdd(defaultInterface);
    },
  );
});
