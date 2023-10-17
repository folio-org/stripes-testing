import moment from 'moment/moment';
import { DevTeams, Permissions, TestTypes } from '../../support/dictionary';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Checkout from '../../support/fragments/checkout/checkout';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import SearchResults from '../../support/fragments/circulation-log/searchResults';
import LoansPage from '../../support/fragments/loans/loansPage';
import UsersCard from '../../support/fragments/users/usersCard';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';

describe('Circulation log', () => {
  let userData;
  let ITEM_BARCODE;
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    requestsId: '',
  };

  before('create test data', () => {
    cy.createTempUser([
      Permissions.circulationLogAll.gui,
      Permissions.uiUsersViewLoans.gui,
      Permissions.uiUsersView.gui,
      Permissions.uiInventoryViewCreateEditItems.gui,
    ]).then((userProperties) => {
      userData = userProperties;

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
      UserEdit.addServicePointViaApi(
        testData.servicePoint.id,
        userData.userId,
        testData.servicePoint.id,
      );
      ITEM_BARCODE = testData.folioInstances[0].barcodes[0];
      Checkout.checkoutItemViaApi({
        itemBarcode: ITEM_BARCODE,
        servicePointId: testData.servicePoint.id,
        userBarcode: userData.barcode,
      });

      CheckInActions.checkinItemViaApi({
        itemBarcode: ITEM_BARCODE,
        servicePointId: testData.servicePoint.id,
        checkInDate: moment.utc().format(),
      });
      cy.login(userData.username, userData.password);
    });
  });

  after('delete test data', () => {
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(userData.userId);
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint: testData.servicePoint,
      shouldCheckIn: true,
    });
    Locations.deleteViaApi(testData.defaultLocation);
  });

  const goToCircLogApp = () => {
    // Click the "Circulation log" app
    TopMenuNavigation.navigateToApp('Circulation log');
    // User on the "Circulation log" app main page, circulation logs are filtered by "Closed loan"
    SearchPane.waitLoading();
    SearchPane.setFilterOptionFromAccordion('loan', 'Closed loan');
    return SearchPane.findResultRowIndexByContent(testData.servicePoint.name);
  };

  it(
    'C17000 Check the Actions button from filtering Circulation log by closed loan (volaris) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.volaris] },
    () => {
      goToCircLogApp().then((rowIndex) => {
        SearchResults.chooseActionByRow(rowIndex, 'Loan details');
        // "Loan details" form is displayed
        LoansPage.waitLoading();
      });
      goToCircLogApp().then((rowIndex) => {
        SearchResults.chooseActionByRow(rowIndex, 'User details');
        // User detailed view is displayed
        UsersCard.waitLoading();
      });
      goToCircLogApp().then((rowIndex) => {
        SearchResults.clickOnCell(ITEM_BARCODE, Number(rowIndex));
        // Item detailed view is displayed
        ItemRecordView.waitLoading();
      });
    },
  );
});
