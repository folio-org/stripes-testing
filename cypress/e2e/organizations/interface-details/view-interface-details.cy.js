import TopMenu from '../../../support/fragments/topMenu';
import Organizations from '../../../support/fragments/organizations/organizations';
import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import OrganizationsSearchAndFilter from '../../../support/fragments/organizations/organizationsSearchAndFilter';

describe('Organizations', () => {
  describe('Interface details', () => {
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
      cy.createTempUser([permissions.uiOrganizationsView.gui]).then((userProperties) => {
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
      'C1325 View interface details (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C1325'] },
      () => {
        OrganizationsSearchAndFilter.searchByParameters('Name', organization.name);
        Organizations.selectOrganization(organization.name);
        Organizations.checkInterfaceIsAdd(defaultInterface);
      },
    );
  });
});
