import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import usersOwners from '../../support/fragments/settings/users/usersOwners';
import settingsMenu from '../../support/fragments/settingsMenu';
import users from '../../support/fragments/users/users';
import eHoldingsPackage from '../../support/fragments/eholdings/eHoldingsPackage';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';

let user;

describe('in-app approach', () => {
  const testData = {
    servicePointS: ServicePoints.getDefaultServicePointWithPickUpLocation(
      'S',
      uuid()
    ),
  };
  before('create test data', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.createViaApi(testData.servicePointS);
      });
    cy.createTempUser([
      permissions.uiSettingseholdingsViewEditCreateDelete.gui,

    ])
      .then(userProperties => {
        cy.log(userProperties);
        user = userProperties;
        cy.login(user.username, user.password, { path: settingsMenu.eHoldingsPath, waiter: usersOwners.waitLoading });
      });
  });

  after('delete test data', () => {
    users.deleteViaApi(user.userProperties);
    ServicePoints.deleteViaApi(testData.servicePointS.id);
  });

  it('C380590 Verify bulk edit of User record that contains NULL values in reference data - CSV (firebird)', () => {
    cy.visit(settingsMenu.eHoldingsPath);
    eHoldingsPackage.customLabel({
      labelOne: 'AutomatingTheFolioApplicationAndTestingApplication',
      labelTwo: 'Test :',
    });
  });
});

