import uuid from 'uuid';
import moment from 'moment/moment';
import { DevTeams, Permissions, TestTypes } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import UserEdit from '../../support/fragments/users/userEdit';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import UsersCard from '../../support/fragments/users/usersCard';
import UserAllFeesFines from '../../support/fragments/users/userAllFeesFines';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import Checkout from '../../support/fragments/checkout/checkout';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';

describe('Manual Fees/Fines', () => {
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    folioInstances: InventoryInstances.generateFolioInstances(),
  };
  const ownerBody = {
    ...UsersOwners.getDefaultNewOwner(),
    servicePointOwner: [
      {
        value: testData.servicePoint.id,
        label: testData.servicePoint.name,
      },
    ],
  };
  let userData;
  let itemBarcode;

  before('Create test data', () => {
    cy.getAdminToken();
    ServicePoints.createViaApi(testData.servicePoint);
    testData.defaultLocation = Locations.getDefaultLocation({
      servicePointId: testData.servicePoint.id,
    });
    Locations.createViaApi(testData.defaultLocation).then((location) => {
      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: testData.folioInstances,
        location,
      });
    });
    UsersOwners.createViaApi(ownerBody).then((ownerResponse) => {
      testData.ownerId = ownerResponse.id;
    });
    cy.createTempUser([Permissions.uiFeeFines.gui]).then((userProperties) => {
      userData = userProperties;
      UserEdit.addServicePointViaApi(
        testData.servicePoint.id,
        userData.userId,
        testData.servicePoint.id,
      );
      itemBarcode = testData.folioInstances[0].barcodes[0];
      Checkout.checkoutItemViaApi({
        id: uuid(),
        itemBarcode,
        loanDate: moment.utc().format(),
        servicePointId: testData.servicePoint.id,
        userBarcode: userData.barcode,
      });
      CheckInActions.checkinItemViaApi({
        itemBarcode,
        servicePointId: testData.servicePoint.id,
        checkInDate: new Date().toISOString(),
      });
      cy.login(userData.username, userData.password, {
        path: TopMenu.usersPath,
        waiter: UsersSearchPane.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    UsersOwners.deleteViaApi(testData.ownerId);
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint: testData.servicePoint,
    });
    Locations.deleteViaApi(testData.defaultLocation);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C451 Verify behavior when "New fee/fine" ellipsis option selected within Open/Closed Loans (vega) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.vega] },
    () => {
      // Find active user in FOLIO
      UsersSearchPane.searchByKeywords(userData.username);
      // Go to User Information for patron
      UsersSearchPane.selectUserFromList(userData.username);
      UsersCard.waitLoading();
      // Expand "Fees/Fines" accordion of User Information
      UsersCard.openFeeFines();
      // Click on "Closed fees/fines" link
      UsersCard.viewAllClosedFeesFines();
      // Click on "Actions" button > select "+ New fee/fine" action
      UserAllFeesFines.createFeeFine();
      // "New fee/fine" modal opened
      NewFeeFine.waitLoading();
      NewFeeFine.checkInitialState({ ...userData, middleName: 'testMiddleName' }, ownerBody.name);
    },
  );
});
