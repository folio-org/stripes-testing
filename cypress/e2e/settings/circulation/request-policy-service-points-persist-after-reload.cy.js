import Permissions from '../../../support/dictionary/permissions';
import RequestPolicy from '../../../support/fragments/circulation/request-policy';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Settings: Circulation', () => {
  let testUser;
  const testData = {
    servicePoint1: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    servicePoint2: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    requestPolicyName: getTestEntityValue('RequestPolicy'),
    requestPolicyId: null,
  };

  before('Create test data and login', () => {
    cy.getAdminToken().then(() => {
      // Create service point 1
      ServicePoints.createViaApi(testData.servicePoint1).then(({ body }) => {
        testData.servicePoint1 = body;

        // Create service point 2
        ServicePoints.createViaApi(testData.servicePoint2).then(({ body: sp2 }) => {
          testData.servicePoint2 = sp2;

          // Create request policy with Hold and Recall configured with service points
          RequestPolicy.createWithAllowedServicePointsViaApi({
            name: testData.requestPolicyName,
            description: 'Test policy for service point persistence',
            holdServicePointId: testData.servicePoint1.id,
            recallServicePointId: testData.servicePoint2.id,
          }).then((policy) => {
            testData.requestPolicyId = policy.id;
          });
        });
      });

      // Create user with required permissions
      cy.createTempUser([
        Permissions.settingsCircCRUDRequestPolicies.gui,
        Permissions.uiTenantSettingsServicePointsCRUD.gui,
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
      RequestPolicy.deleteViaApi(testData.requestPolicyId);
      ServicePoints.deleteViaApi(testData.servicePoint1.id);
      ServicePoints.deleteViaApi(testData.servicePoint2.id);
      Users.deleteViaApi(testUser.userId);
    });
  });

  it(
    'C410746 Check that selected service points do not disappear from edit page after user reloads the Request policy page (vega)',
    { tags: ['extendedPath', 'vega', 'C410746'] },
    () => {
      // Step 1: Go to "Circulation" > "Request policies" > click on request policy from preconditions
      // > "Actions" > select "Edit" action
      RequestPolicy.selectRequestPolicy(testData.requestPolicyName);
      RequestPolicy.editRequestPolicy();

      // Expected: Edit page for selected request policy is opened
      // Selected in preconditions service points displayed
      RequestPolicy.waitLoadingEditForm();
      RequestPolicy.verifyServicePointSelected(testData.servicePoint1.name);
      RequestPolicy.verifyServicePointSelected(testData.servicePoint2.name);

      // Step 2: Reload the page
      cy.reload();
      RequestPolicy.waitLoadingEditForm();

      // Expected: Selected in preconditions service points still displayed
      RequestPolicy.verifyServicePointSelected(testData.servicePoint1.name);
      RequestPolicy.verifyServicePointSelected(testData.servicePoint2.name);
    },
  );
});
