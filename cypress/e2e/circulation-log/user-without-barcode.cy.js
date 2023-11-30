import uuid from 'uuid';
import { Permissions } from '../../support/dictionary';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Circulation log', () => {
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    requestsId: '',
  };
  let userData = {
    password: getTestEntityValue('Password'),
    username: getTestEntityValue('cypressTestUser'),
  };
  let newUserProperties;

  before('Create test data', () => {
    cy.getAdminToken();

    ServicePoints.createViaApi(testData.servicePoint);
    testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
    Locations.createViaApi(testData.defaultLocation).then((location) => {
      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: testData.folioInstances,
        location,
      });
    });

    PatronGroups.createViaApi().then((patronGroupId) => {
      newUserProperties = {
        patronGroup: patronGroupId,
        barcode: null,
        active: true,
        username: userData.username,
        personal: {
          preferredContactTypeId: '002',
          firstName: getTestEntityValue('testPermFirst'),
          middleName: getTestEntityValue('testMiddleName'),
          lastName: getTestEntityValue('testLastName'),
          email: 'test@folio.org',
        },
      };
      testData.patronGroupId = patronGroupId;
      testData.userProperties = { barcode: uuid() };
      const queryField = 'displayName';
      const permissions = [
        Permissions.circulationLogAll.gui,
        Permissions.checkinAll.gui,
        Permissions.inventoryAll.gui,
      ];
      cy.getPermissionsApi({
        query: `(${queryField}=="${permissions.join(`")or(${queryField}=="`)}"))"`,
      }).then((permissionsResponse) => {
        Users.createViaApi(newUserProperties).then((userProperties) => {
          userData = { ...userData, ...userProperties };
          cy.setUserPassword(userData);
          cy.addPermissionsToNewUserApi({
            userId: userData.id,
            permissions: [
              ...permissionsResponse.body.permissions.map(
                (permission) => permission.permissionName,
              ),
            ],
          });
          cy.overrideLocalSettings(userData.id);
          UserEdit.addServicePointViaApi(
            testData.servicePoint.id,
            userData.id,
            testData.servicePoint.id,
          );
          cy.login(userData.username, userData.password);
        });
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    UserEdit.changeServicePointPreferenceViaApi(userData.id, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(userData.id);
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint: testData.servicePoint,
      shouldCheckIn: true,
    });
    Locations.deleteViaApi(testData.defaultLocation);
    PatronGroups.deleteViaApi(testData.patronGroupId);
  });

  it(
    'C360554 Verify that "-" shown if User does not have barcode (volaris) (TaaS)',
    { tags: ['extendedPath', 'volaris'] },
    () => {
      const itemBarcode = testData.folioInstances[0].barcodes[0];
      // Navigate to the "Check in" app and check in the Item (step 2)
      cy.visit(TopMenu.checkInPath);
      CheckInActions.checkInItem(itemBarcode);
      // The item is Checked in
      // Navigate to the "Circulation log" app
      cy.visit(TopMenu.circulationLogPath);
      // Search for the checked in Item by "Item barcode" field => Click "Apply" button
      SearchPane.searchByItemBarcode(itemBarcode);
      // Check the row with the Item checked in (step 3) status
      // In the "User barcode" column "-" is displayed
      SearchPane.checkUserData('User barcode', '-', 0);
      SearchPane.checkUserData('Circ action', 'Checked in', 0);
    },
  );
});
