import Permissions from '../../../support/dictionary/permissions';
import RequestPolicy from '../../../support/fragments/circulation/request-policy';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';

describe('Settings: Circulation', () => {
  let testUser;

  before('Create test data and login', () => {
    cy.getAdminToken().then(() => {
      // Create user with required permissions
      cy.createTempUser([
        Permissions.settingsCircCRUDRequestPolicies.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProps) => {
        testUser = userProps;
        cy.login(testUser.username, testUser.password, {
          path: SettingsMenu.circulationRequestPoliciesPath,
          waiter: RequestPolicy.waitLoading,
        });
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testUser.userId);
    });
  });

  it(
    'C411717 Check a clickable pop out message for Holds on Request policy page (vega)',
    { tags: ['extendedPath', 'vega', 'C411717'] },
    () => {
      // Step 1: Go to "Settings" app > Circulation > Request policies > click "+ New" button
      RequestPolicy.clickNewPolicy();

      // Expected: "New request policy" page is opened
      // "i" clickable icon is displayed next to "Hold" request type
      RequestPolicy.verifyNewPolicyFormIsOpened();
      RequestPolicy.verifyHoldsInfoIconDisplayed();

      // Step 2: Click on "i" icon
      RequestPolicy.clickHoldsInfoIcon();

      // Expected: "If the "Fail to create title level hold when request is blocked by circulation rule" setting is unchecked,
      // title level holds will always be allowed. (Settings > Circulation > Title level requests)" pop out message is displayed
      RequestPolicy.verifyHoldsInfoPopoverContent();

      // Step 3: Click outside the pop out message
      RequestPolicy.clickOutsidePopover();

      // Expected: Pop out message disappears
      RequestPolicy.verifyHoldsInfoPopoverNotDisplayed();
    },
  );
});
