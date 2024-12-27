import permissions from '../../../support/dictionary/permissions';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
const newServicePoint = {
  name: `testNameSP_${getRandomPostfix()}`,
  code: `testCodeSp_${getRandomPostfix()}`,
  displayName: `testDisplayNameSP_${getRandomPostfix()}`,
  newNameForEdit: `test_${getRandomPostfix()}`,
};

describe('Settings: Tenant', () => {
  before('create test data', () => {
    cy.createTempUser([permissions.uiTenantSettingsServicePointsCRUD.gui]).then(
      (userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password);
        cy.wait(2000);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        ServicePoints.goToServicePointsTab();
      },
    );
  });

  after('delete test data', () => {
    cy.getAdminToken();
    ServicePoints.getViaApi({ query: `("name"=="${newServicePoint.newNameForEdit}")` }).then(
      (servicePoints) => {
        ServicePoints.deleteViaApi(servicePoints[0].id);
      },
    );
    Users.deleteViaApi(user.userId);
  });

  it(
    'C375150 Verify that user can save new Service point (firebird)',
    { tags: ['smoke', 'firebird', 'C375150', 'eurekaPhase1'] },
    () => {
      ServicePoints.createNewServicePoint(newServicePoint);
      ServicePoints.servicePointExists(newServicePoint.name);
    },
  );

  it(
    'C375151 Verify that user can edit existing Service point (firebird)',
    { tags: ['smoke', 'firebird', 'C375151', 'eurekaPhase1'] },
    () => {
      ServicePoints.editServicePoint({
        name: newServicePoint.name,
        newName: newServicePoint.newNameForEdit,
      });
      ServicePoints.servicePointExists(newServicePoint.newNameForEdit);
    },
  );
});
