import TopMenu from '../../support/fragments/topMenu';
import Organizations from '../../support/fragments/organizations/organizations';
import Permissions from '../../support/dictionary/permissions';
import Users from '../../support/fragments/users/users';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import OrganizationsSearchAndFilter from '../../support/fragments/organizations/organizationsSearchAndFilter';

describe('Organizations', () => {
  const organization = {
    ...NewOrganization.defaultUiOrganizations,
    isVendor: true,
  };
  let user;

  before('Create user and organization', () => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((organizationId) => {
      organization.id = organizationId;
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

  it(
    'C358965 Make existing organization NOT a Vendor (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C358965'] },
    () => {
      OrganizationsSearchAndFilter.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.editOrganization();
      Organizations.deselectVendor();
      Organizations.verifySaveCalloutMessage(organization);
    },
  );
});
