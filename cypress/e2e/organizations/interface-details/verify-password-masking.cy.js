import TopMenu from '../../../support/fragments/topMenu';
import Organizations from '../../../support/fragments/organizations/organizations';
import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import OrganizationsSearchAndFilter from '../../../support/fragments/organizations/organizationsSearchAndFilter';

describe('Organizations --> Interface details', () => {
  let user;
  const defaultInterface = { ...NewOrganization.defaultInterface };
  const credentialsForTnterface = {
    username: 'my_user',
    password: 'my_password',
    interfaceId: '',
  };
  const organization = {
    ...NewOrganization.defaultUiOrganizations,
    interfaces: [],
  };

  before('Create user and organization with interface', () => {
    cy.getAdminToken();
    Organizations.createInterfaceViaApi(defaultInterface).then((interfaceId) => {
      defaultInterface.id = interfaceId;
      organization.interfaces.push(interfaceId);
      credentialsForTnterface.interfaceId = interfaceId;
      Organizations.createInterfaceCredentialsViaApi(interfaceId, credentialsForTnterface);
    });
    Organizations.createOrganizationViaApi(organization).then((organizationId) => {
      organization.id = organizationId;
    });
    cy.createTempUser([
      permissions.uiOrganizationsInterfaceUsernamesAndPasswordsViewEditCreateDelete.gui,
      permissions.uiOrganizationsInterfaceUsernamesAndPasswordsView.gui,
      permissions.uiOrganizationsViewEdit.gui,
    ]).then((userProperties) => {
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
    'C3455 Verify that password is masked by default (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C3455'] },
    () => {
      OrganizationsSearchAndFilter.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.checkInterfaceIsAdd(defaultInterface);
      Organizations.editOrganization();
      Organizations.selectInterface(defaultInterface);
      Organizations.clickShowInterfaceCredentials();
      Organizations.verifyPasswordDisplayed(credentialsForTnterface);
    },
  );
});
