import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TenantPane from '../../../../support/fragments/settings/tenant/tenantPane';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();
const newServicePoint = {
  name: `AT_C375150_testNameSP_${getRandomPostfix()}`,
  code: `testCodeSp_${getRandomPostfix()}`,
  displayName: `AT_C375150_testDisplayNameSP_${getRandomPostfix()}`,
  newNameForEdit: `AT_C375150_test_${getRandomPostfix()}`,
};

describe('Settings: Tenant', () => {
  before('create test data', () => {
    cy.setTenant(memberTenant.id);
    cy.getUserToken(user.username, user.password);

    cy.allure().logCommandSteps(false);
    cy.login(user.username, user.password, {
      path: SettingsMenu.tenantPath,
      waiter: TenantPane.waitLoading,
    });
    cy.allure().logCommandSteps(true);
    ServicePoints.goToServicePointsTab();
  });

  after('delete test data', () => {
    cy.getUserToken(user.username, user.password);
    cy.setTenant(memberTenant.id);
    ServicePoints.getViaApi({ query: `("name"=="${newServicePoint.name}")` }).then(
      (servicePoints) => {
        ServicePoints.deleteViaApi(servicePoints[0].id);
      },
    );
  });

  it(
    'C375150 Verify that user can save new Service point (firebird)',
    { tags: ['dryRun', 'firebird', 'C375150'] },
    () => {
      ServicePoints.createNewServicePoint(newServicePoint);
      ServicePoints.servicePointExists(newServicePoint.name);
    },
  );
});
