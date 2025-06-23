import Permissions from '../../../support/dictionary/permissions';
import CirculationRules from '../../../support/fragments/circulation/circulation-rules';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Permissions -> Circulation', () => {
  let testUser;
  const circulationRulesComment = ` # comment_${getRandomPostfix()}`;

  before('Prepare test data', () => {
    cy.getAdminToken();
    // Create user with all required permissions
    cy.createTempUser(
      [
        Permissions.uiCirculationViewCreateEditDelete.gui,
        Permissions.uiCirculationSettingsNoticePolicies.gui,
        Permissions.settingsCircCRUDRequestPolicies.gui,
        Permissions.uiCirculationSettingsOverdueFinesPolicies.gui,
        Permissions.uiCirculationSettingsLostItemFeesPolicies.gui,
        Permissions.settingsLoanPoliciesAll.gui
      ]
    ).then(userProps => {
      testUser = userProps;
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    CirculationRules.deleteRuleViaApi(circulationRulesComment);
    Users.deleteViaApi(testUser.userId);
  });

  it('C1212 Settings (Circ): Can create, edit and remove circulation rules (vega)',
    { tags: ['extendedPath', 'vega', 'C1212'] },
    () => {
      cy.login(testUser.username, testUser.password,
        { path: SettingsMenu.circulationRulesPath, waiter: () => cy.wait(5000) });

      // CirculationRules.moveCursorFocusToTheEnd();
      CirculationRules.fillInCirculationRules(circulationRulesComment);
      CirculationRules.moveCursorFocusToTheEnd();
      CirculationRules.saveCirculationRules();
      CirculationRules.checkUpdateCirculationRulesCalloutAppeared();
      cy.wait(2000).then(() => {
        CirculationRules.checkCirculationRulesContainTextViaApi(circulationRulesComment);
      });
    });
});
