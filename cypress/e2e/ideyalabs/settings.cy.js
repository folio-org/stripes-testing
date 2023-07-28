import devTeams from '../../support/dictionary/devTeams';
import permissions from '../../support/dictionary/permissions';
import testTypes from '../../support/dictionary/testTypes';
import eHoldingsPackage from '../../support/fragments/eholdings/eHoldingsPackage';
import usersOwners from '../../support/fragments/settings/users/usersOwners';
import settingsMenu from '../../support/fragments/settingsMenu';
import users from '../../support/fragments/users/users';

let user;

describe('Settings-Permissions', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.uieHoldingsItemCreate.gui,
      permissions.uieHoldingsItemView.gui,
      permissions.uieHoldingsItemEdit.gui,
    ]).then((userProperties) => {
      cy.log(userProperties);
      user = userProperties;
      cy.login(user.username, user.password, {
        path: settingsMenu.eHoldingsPath,
        waiter: usersOwners.waitLoading,
      });
    });
  });

  after('delete test data', () => {
    users.deleteViaApi(user.userId);
  });

  it(
    'C9236 Settings: Add/Edit a custom label',
    { tags: [testTypes.extendedPath, devTeams.spitfire] },
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
