import { APPLICATION_NAMES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';

describe('Circulation log', () => {
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    requestsId: '',
    user: Users.generateUserModel(),
  };

  before('Create test data', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' }).then(
          (servicePoints) => {
            testData.servicePointId = servicePoints[0].id;
          },
        );
        cy.getLocations({ limit: 1 })
          .then((res) => {
            testData.location = res;
          })
          .then((location) => {
            InventoryInstances.createFolioInstancesViaApi({
              folioInstances: testData.folioInstances,
              location,
            });
          });
      })
      .then(() => {
        cy.createTempUserParameterized(
          testData.user,
          [
            Permissions.circulationLogAll.gui,
            Permissions.checkinAll.gui,
            Permissions.inventoryAll.gui,
          ],
          { userType: 'patron', barcode: false },
        )
          .then((userProperties) => {
            testData.user = userProperties;
            testData.user = { ...testData.user, ...userProperties };
          })
          .then(() => {
            ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' })
              .then((servicePoints) => {
                testData.servicePointId = servicePoints[0].id;
              })
              .then(() => {
                UserEdit.addServicePointViaApi(
                  testData.servicePointId,
                  testData.user.userId,
                  testData.servicePointId,
                );
              })
              .then(() => {
                // cy.overrideLocalSettings(testData.user.userId);
              });
          });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePoint.id]);
    Users.deleteViaApi(testData.user.userId);
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint: testData.servicePoint,
      shouldCheckIn: true,
    });
  });

  it(
    'C360554 Verify that "-" shown if User does not have barcode (volaris) (TaaS)',
    { tags: ['extendedPath', 'volaris', 'C360554'] },
    () => {
      const itemBarcode = testData.folioInstances[0].barcodes[0];
      // Navigate to the "Check in" app and check in the Item (step 2)
      cy.waitForAuthRefresh(() => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.checkInPath,
          waiter: CheckInActions.waitLoading,
        });
        CheckInActions.checkInItem(itemBarcode);
      });

      // The item is Checked in
      // Navigate to the "Circulation log" app

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CIRCULATION_LOG);
      // Search for the checked in Item by "Item barcode" field => Click "Apply" button
      SearchPane.searchByItemBarcode(itemBarcode);
      // Check the row with the Item checked in (step 3) status
      // In the "User barcode" column "-" is displayed
      SearchPane.checkUserData('User barcode', '-', 0);
      SearchPane.checkUserData('Circ action', 'Checked in', 0);
    },
  );
});
