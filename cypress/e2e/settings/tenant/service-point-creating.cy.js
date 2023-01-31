import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import devTeams from '../../../support/dictionary/devTeams';
import Users from '../../../support/fragments/users/users';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const newServicePoint = {
  name: `testNameSP_${getRandomPostfix()}`,
  code: `testCodeSp_${getRandomPostfix()}`,
  displayName: `testDisplayNameSP_${getRandomPostfix()}`,
};

describe('Service points', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.uiTenantSettingsServicePointsCRUD.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password, { path: TopMenu.settingsPath, waiter: SettingsPane.waitLoading });
      });
  });

  after('delete test data', () => {
    ServicePoints.getViaApi({ query: `("name"=="${newServicePoint.name}")` }).then(servicePoints => {
      ServicePoints.deleteViaApi(servicePoints[0].id);
    });
    Users.deleteViaApi(user.userId);
  });

  it('C375150 Verify that user can save new Service point (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    ServicePoints.goToServicePointsTab();
    ServicePoints.createNewServicePoint(newServicePoint);
    ServicePoints.servicePointExists(newServicePoint.name);
  });
});
