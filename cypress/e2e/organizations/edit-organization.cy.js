import TopMenu from '../../support/fragments/topMenu';
import TestType from '../../support/dictionary/testTypes';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import devTeams from '../../support/dictionary/devTeams';
import permissions from '../../support/dictionary/permissions';
import Users from '../../support/fragments/users/users';

describe('Organizations', () => {
  const organization = { ...NewOrganization.defaultUiOrganizations };
  let user;

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
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
    Users.deleteViaApi(user.userId);
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it(
    'C673 Edit existing organization record (thunderjet)',
    { tags: [TestType.criticalPath, devTeams.thunderjet] },
    () => {
      Organizations.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.editOrganization();
      Organizations.editOrganizationName(organization);
      organization.name = `${organization.name}-edited`;
      Organizations.checkCreatedOrganization(organization);
    },
  );
});
