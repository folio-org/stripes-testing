import permissions from '../../support/dictionary/permissions';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import NewOrganization from '../../support/fragments/organizations/newOrganization';

describe('Organizations', () => {
  const organization = {
    name: `1_autotest_name_${getRandomPostfix()}`,
    status: 'Active',
    code: `autotest_code_${getRandomPostfix()}`,
    isVendor: false,
    isDonor: true,
    erpCode: `ERP-${getRandomPostfix()}`,
  };
  const firstContact = { ...NewOrganization.defaultContact };
  let user;

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
    });
    cy.loginAsAdmin({ path: TopMenu.organizationsPath, waiter: Organizations.waitLoading });
    Organizations.searchByParameters('Name', organization.name);
    Organizations.selectOrganization(organization.name);
    Organizations.editOrganization();
    Organizations.addNewDonorContact(firstContact);
    Organizations.closeContact();
    Organizations.addDonorContactToOrganization(firstContact);
    Organizations.checkDonorContactIsAdd(firstContact);
    Organizations.saveOrganization();
    cy.createTempUser([permissions.uiOrganizationsViewEdit.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    Organizations.getOrganizationViaApi({ query: `name="${organization.name}"` }).then(
      (returnedOrganization) => {
        Organizations.deleteOrganizationViaApi(returnedOrganization.id);
      },
    );
  });

  it(
    'C423625 A user without  privileged donor information permission cannot view privileged donor information when edit organization record (thunderjet)',
    { tags: ['criticalPath', 'thunderjet'] },
    () => {
      Organizations.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.editOrganization();
      Organizations.removeDonorFromOrganization();
      Organizations.checkIsNotaDonor(organization);
      Organizations.editOrganization();
      Organizations.addDonorToOrganization();
    },
  );
});
