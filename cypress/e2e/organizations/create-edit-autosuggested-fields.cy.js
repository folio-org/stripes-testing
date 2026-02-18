import Permissions from '../../support/dictionary/permissions';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Organizations', () => {
  let user;
  const organization = { ...NewOrganization.defaultUiOrganizations };

  before('Create user and organization', () => {
    cy.getAdminToken();
    cy.createTempUser([
      Permissions.uiOrganizationsViewEdit.gui,
      Permissions.uiOrganizationsViewEditCreate.gui,
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
    cy.getAdminToken();
    Organizations.getOrganizationViaApi({ name: organization.name }).then((response) => {
      Organizations.deleteOrganizationViaApi(response.id);
    });
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
      Organizations.verifySaveCalloutMessage(organization);
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
      Organizations.verifySaveCalloutMessage(organization);
    },
  );
});
