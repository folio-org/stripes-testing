import permissions from '../../support/dictionary/permissions';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Organizations', () => {
  const organization = {
    ...NewOrganization.defaultUiOrganizations,
    code: `1${getRandomPostfix()}`,
  };
  let user;

  before(() => {
    cy.getAdminToken();

    cy.createTempUser([permissions.uiOrganizationsViewEditCreate.gui]).then((userProperties) => {
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
    'C423632 A user without  privileged donor information permission cannot view privileged donor information when create organization record (thunderjet)',
    { tags: ['criticalPathFlaky', 'thunderjet', 'C423632'] },
    () => {
      Organizations.newOrganization();
      Organizations.selectDonorCheckbox();
      Organizations.varifyAbsentPrivilegedDonorInformationSection();
      Organizations.selectDonorCheckbox();
      Organizations.varifyAbsentPrivilegedDonorInformationSection();
      Organizations.fillInInfoNewOrganization(organization);
      Organizations.selectDonorCheckbox();
      Organizations.saveOrganization();
      Organizations.varifySaveOrganizationCalloutMessage(organization);
      Organizations.varifyAbsentPrivilegedDonorInformationSection();
    },
  );
});
