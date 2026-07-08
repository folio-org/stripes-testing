import Permissions from '../../../support/dictionary/permissions';
import RequestPolicy from '../../../support/fragments/circulation/request-policy';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Settings: Circulation', () => {
  let testUser;
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    requestPolicyName: getTestEntityValue('RequestPolicy'),
  };

  before('Create test data and login', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.createViaApi(testData.servicePoint).then(({ body }) => {
        testData.servicePoint = body;
      });
      // Create user with required permissions
      cy.createTempUser([
        Permissions.uiTenantSettingsServicePointsCRUD.gui,
        Permissions.settingsCircCRUDRequestPolicies.gui,
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
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      // Attempt cleanup in case test failed before asserting policy was not created
      RequestPolicy.deleteRequestPolicyByNameViaAPI(testData.requestPolicyName);
      Users.deleteViaApi(testUser.userId);
    });
  });

  it(
    'C410745 Check the error if during the creation of request policy pick up location of service point was changed from "Yes" to "No" (vega)',
    { tags: ['extendedPath', 'vega', 'C410745'] },
    () => {
      // Step 1: Go to "Circulation" > "Request policies" > click "+ New" button
      RequestPolicy.clickNewPolicy();
      // Expected: "New request policy" window is opened
      RequestPolicy.verifyNewPolicyFormIsOpened();

      // Step 2: Enter any value into "Request policy name*" field
      RequestPolicy.setName(testData.requestPolicyName);
      // Expected: "Request policy name*" field is filled
      RequestPolicy.verifyNameFieldValue(testData.requestPolicyName);

      // Step 3: Click "Page" checkbox > select "Allow some pickup service points" radio button
      // > select created service point from the dropdown
      RequestPolicy.selectPageCheckboxAndAllowSomePickupServicePoints(testData.servicePoint.name);

      // Step 4: Make created service point not a pickup location via API call
      ServicePoints.disablePickupLocationViaApi(testData.servicePoint.id);
      // Expected: Changes saved; created service point is not a pickup location anymore
      // (verification happens via API response)

      // Step 5: Go back to "Settings" app, and click "Save & close" button on create request policy form
      RequestPolicy.save();
      // Expected: An error "One or more Pickup locations are no longer available" displayed
      // User remains on create request policy page
      InteractorsTools.checkCalloutErrorMessage(
        'One or more Pickup locations are no longer available',
      );
      RequestPolicy.verifyNewPolicyFormIsOpened();

      // Step 6: Click "Cancel" button
      RequestPolicy.clickCancel();

      // Expected: Request policy with entered name is not appeared in the list of request policies
      RequestPolicy.waitLoading();
      RequestPolicy.verifyRequestPolicyInNotInTheList(testData.requestPolicyName);

      // Additional verification via API that policy was not created
      RequestPolicy.verifyPolicyNotCreated(testData.requestPolicyName);
    },
  );
});
