import uuid from 'uuid';
import TestTypes from '../../support/dictionary/testTypes';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import permissions from '../../support/dictionary/permissions';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import eHoldingsPackage from '../../support/fragments/eholdings/eHoldingsPackage';
import settingsMenu from '../../support/fragments/settingsMenu';

describe('Creating custom labels', () => {
  const userData = {};
  const testData = {
    servicePointS: ServicePoints.getDefaultServicePointWithPickUpLocation(
      'S',
      uuid()
    ),
  };
  before('Preconditions', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.createViaApi(testData.servicePointS);
      testData.defaultLocation = Location.getDefaultLocation(
        testData.servicePointS.id
      );
    });
    cy.createTempUser([
      permissions.uiSettingseholdingsViewEditCreateDelete.gui,
      permissions.uieHoldingsTitlesPackagesCreateDelete.gui,
    ])
      .then((userProperties) => {
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
      })
      .then(() => {
        UserEdit.addServicePointsViaApi(
          [testData.servicePointS.id],
          userData.userId,
          testData.servicePointS.id
        );
        cy.login(userData.username, userData.password);
      });
  });

  after('Deleting created entities', () => {
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [
      testData.servicePointS.id,
    ]);
    ServicePoints.deleteViaApi(testData.servicePointS.id);
    Users.deleteViaApi(userData.userId);
  });
  it(
    'C9236  Settings: Add/Edit a custom label(spitfire)',
    { tags: [TestTypes.ideaLabsTests] },
    () => {
      cy.visit(settingsMenu.eHoldingsPath);
      eHoldingsPackage.customLabel({
        labelOne: 'AutomatingTheFolioApplicationAndTestingApplication',
        labelTwo: 'Test :',
      });
      cy.visit('/eholdings/resources/58-473-185972');
      eHoldingsPackage.verifyCustomLabel();
    }
  );
});
