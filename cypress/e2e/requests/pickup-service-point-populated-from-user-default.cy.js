import {
  FULFILMENT_PREFERENCES,
  ITEM_STATUS_NAMES,
  LOCATION_IDS,
  REQUEST_TYPES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import NewRequest from '../../support/fragments/requests/newRequest';
import RequestsSearchResultsPane from '../../support/fragments/requests/requestsSearchResultsPane';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';

describe('Requests', () => {
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
  };
  let userData = {};

  before('Create test data', () => {
    cy.getAdminToken()
      .then(() => ServicePoints.getCircDesk1ServicePointViaApi())
      .then((servicePoint) => {
        testData.servicePoint = servicePoint;
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location: { id: LOCATION_IDS.MAIN_LIBRARY },
        });
      })
      .then(() => cy.createTempUser([Permissions.uiRequestsAll.gui]))
      .then((userProperties) => {
        userData = userProperties;
        UserEdit.addServicePointViaApi(
          testData.servicePoint.id,
          userData.userId,
          testData.servicePoint.id,
        );
        // createTempUser already creates a preference with defaultServicePointId: null,
        // so we need to update it to point to the desired default pickup service point.
        cy.getRequestPreference({ query: `userId=="${userData.userId}"` }).then((response) => {
          const existing = response.body.requestPreferences[0];
          cy.updateRequestPreference(existing.id, {
            ...existing,
            defaultServicePointId: testData.servicePoint.id,
            fulfillment: FULFILMENT_PREFERENCES.HOLD_SHELF,
            holdShelf: true,
            delivery: false,
          });
        });
        cy.login(userData.username, userData.password, {
          path: TopMenu.requestsPath,
          waiter: RequestsSearchResultsPane.waitLoading,
        });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
      testData.folioInstances[0].barcodes[0],
    );
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C468144 Check that "Pickup service point" value on an item request is populated with the user\'s default pickup service point (vega)',
    { tags: ['extendedPath', 'vega', 'C468144'] },
    () => {
      // Step 1: Click "Actions" > "New" button
      NewRequest.openNewRequestPane();
      NewRequest.waitLoadingNewRequestPage();

      // Step 2: If "Create title level request" option exists, ensure it is not checked
      cy.get('body').then(($body) => {
        if ($body.find('[name="createTitleLevelRequest"]').length > 0) {
          NewRequest.unselectTitleLevelRequest();
        }
      });

      // Step 3: Fill in Item barcode and verify item is scanned
      NewRequest.enterItemInfo(testData.folioInstances[0].barcodes[0]);
      NewRequest.verifyItemInformation([
        testData.folioInstances[0].barcodes[0],
        ITEM_STATUS_NAMES.AVAILABLE,
      ]);

      // Step 4: Fill in Requester barcode and verify requester is scanned
      NewRequest.enterRequesterBarcode(userData.barcode);
      NewRequest.verifyRequesterInformation(userData.username, userData.barcode);

      // Step 5: Select "Page" request type.
      // Expected: "Pickup service point" dropdown appears pre-populated with
      // the user's default pickup service point "Circ Desk 1"
      NewRequest.chooseRequestType(REQUEST_TYPES.PAGE);
      cy.wait(1000);
      NewRequest.verifyPickupServicePointPrePopulated(testData.servicePoint.name);
    },
  );
});
