import permissions from '../../support/dictionary/permissions';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import newOrganization from '../../support/fragments/organizations/newOrganization';

describe('Organizations', () => {
  let user;
  const organization = { ...newOrganization.defaultUiOrganizations };

  before('Create user and organization', () => {
    cy.getAdminToken();
    cy.createTempUser([
      permissions.uiOrganizationsViewEdit.gui,
      permissions.uiOrganizationsViewEditCreate.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
        authRefresh: true,
      });
    });
  });

  after('Delete test data', () => {
    cy.loginAsAdmin({
      path: TopMenu.organizationsPath,
      waiter: Organizations.waitLoading,
      authRefresh: true,
    });
    Organizations.searchByParameters('Name', organization.name);
    Organizations.selectOrganizationInCurrentPage(organization.name);
    Organizations.deleteOrganization();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C709267: Create and edit autosuggested fields on create and edit organization pages',
    { tags: ['extendedPath', 'thunderjet', 'C709267'] },
    () => {
      Organizations.newOrganization();
      Organizations.fillInInfoNewOrganization(organization);
      Organizations.openContactInformationSection();
      Organizations.clickAddAdressButton();
      Organizations.addAdressToOrganization({ addressLine1: 'Test Address 1' }, 0);
      Organizations.clickAddAdressButton();
      Organizations.addAdressToOrganization({ addressLine1: 'Test Address 2' }, 1);
      Organizations.clickAddAdressButton();
      Organizations.addAdressToOrganization({ addressLine1: 'Test Address 3' }, 2);
      Organizations.clickAddAdressButton();
      Organizations.addAdressToOrganization({ addressLine1: 'Test Address 4' }, 3);
      Organizations.saveOrganization();
      Organizations.varifySaveOrganizationCalloutMessage(organization);
      Organizations.editOrganization();
      Organizations.openContactInformationSection();
      Organizations.addAdressToOrganization({ addressLine1: 'Test Address Edited' }, 0);
      Organizations.clickAddAdressButton();
      Organizations.addAdressToOrganization({ addressLine1: 'Test Address 4' }, 4);
      Organizations.clickAddPhoneNumberButton();
      Organizations.addPhoneNumberToOrganization({ phoneNum: '123' }, 0);
      Organizations.clickAddPhoneNumberButton();
      Organizations.addPhoneNumberToOrganization({ phoneNum: '123456' }, 1);
      Organizations.saveOrganization();
      Organizations.varifySaveOrganizationCalloutMessage(organization);
    },
  );
});
