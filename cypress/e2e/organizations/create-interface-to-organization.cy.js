import TopMenu from '../../support/fragments/topMenu';
import TestType from '../../support/dictionary/testTypes';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import devTeams from '../../support/dictionary/devTeams';
import permissions from '../../support/dictionary/permissions';
import Users from '../../support/fragments/users/users';

describe('Organizations', () => {
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const defaultInterface = { ...NewOrganization.defaultInterface };
  let user;

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
    });
    cy.createTempUser([
      permissions.uiOrganizationsViewEditCreate.gui,
      permissions.uiOrganizationsInterfaceUsernamesAndPasswordsViewEditCreateDelete.gui,
    ]).then((userProperties) => {
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
    'C3467 Create an interface and Assign to an Organization record (thunderjet)',
    { tags: [TestType.criticalPath, devTeams.thunderjet] },
    () => {
      Organizations.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.editOrganization();
      Organizations.addNewInterface(defaultInterface);
      Organizations.closeInterface();
      Organizations.addIntrefaceToOrganization(defaultInterface);
      Organizations.checkInterfaceIsAdd(defaultInterface);
      Organizations.editOrganization();
      Organizations.selectInterface(defaultInterface);
      Organizations.deleteInterface();
      Organizations.cancelOrganization();
    },
  );
});
