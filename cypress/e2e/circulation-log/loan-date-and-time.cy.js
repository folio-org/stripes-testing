import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import { DevTeams, Permissions, TestTypes } from '../../support/dictionary';
import UserEdit from '../../support/fragments/users/userEdit';
import Checkout from '../../support/fragments/checkout/checkout';
import TopMenu from '../../support/fragments/topMenu';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import CheckinActions from '../../support/fragments/check-in-actions/checkInActions';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import Users from '../../support/fragments/users/users';
import { MultiColumnListCell } from '../../../interactors';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import SearchResults from '../../support/fragments/circulation-log/searchResults';
import LoansPage from '../../support/fragments/loans/loansPage';

describe('Loan date and time', () => {
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    requestsId: '',
  };
  let userData;
  let ITEM_BARCODE;

  before('create inventory instance', () => {
    cy.getAdminToken();
    ServicePoints.createViaApi(testData.servicePoint);
    testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
    Location.createViaApi(testData.defaultLocation).then((location) => {
      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: testData.folioInstances,
        location,
      });
    });
    cy.createTempUser([
      Permissions.circulationLogAll.gui,
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiUsersViewLoans.gui,
      Permissions.uiInventoryViewCreateEditDeleteItems.gui,
    ])
      .then((userProperties) => {
        userData = userProperties;
      })
      .then(() => {
        ITEM_BARCODE = testData.folioInstances[0].barcodes[0];
        UserEdit.addServicePointViaApi(testData.servicePoint.id, userData.userId);

        Checkout.checkoutItemViaApi({
          itemBarcode: ITEM_BARCODE,
          servicePointId: testData.servicePoint.id,
          userBarcode: userData.barcode,
        });
        cy.login(userData.username, userData.password, {
          path: TopMenu.circulationLogPath,
          waiter: SearchPane.waitLoading,
        });
      });
  });

  after('Delete all data', () => {
    CheckinActions.checkinItemViaApi({
      itemBarcode: ITEM_BARCODE,
      servicePointId: testData.servicePoint.id,
    });
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint: testData.servicePoint,
      shouldCheckIn: true,
    });
    Locations.deleteViaApi(testData.defaultLocation);
    Users.deleteViaApi(userData.userId);
  });

  const navigateToCircLogAndSearchItem = (barcode) => {
    // Select the Circulation log app
    cy.visit(TopMenu.circulationLogPath);
    // "Loan" accordion => Expand "Loan" accordion and Select "Checked Out" and "Checked In" => Search for an item
    SearchPane.searchByCheckedOut();
    SearchPane.findResultRowIndexByContent(barcode).then((rowIndex) => {
      SearchPane.checkResultSearch(
        {
          itemBarcode: barcode,
          circAction: 'Checked out',
        },
        rowIndex,
      );
    });
    SearchPane.searchByItemBarcode(barcode);
  };

  it(
    'C350710 Check date and time -- loans (firebird) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.firebird] },
    () => {
      navigateToCircLogAndSearchItem(ITEM_BARCODE);
      SearchPane.verifyResultCells(true);
      cy.wrap(MultiColumnListCell({ row: 0, columnIndex: 4 }).text()).as('date');
      // Click to "Item barcode" on the row with Circ Action "Checked out" => View "Checked Out" date and time displayed on Items view page
      SearchResults.clickOnCell(ITEM_BARCODE, 0);
      cy.get('@date').then((date) => {
        InventoryInstance.verifyCheckedOutDate(date);
        // Go to the result list with items again
        navigateToCircLogAndSearchItem(ITEM_BARCODE);
        // Click on ellipsed Action dropdown from the Action column => click on 'Loan Details'
        SearchResults.chooseActionByRow(0, 'Loan details');
        LoansPage.waitLoading();
        // Check the date and time displayed for 'Checked Out' of loan
        LoansPage.checkLoanDate(date);
      });
    },
  );
});
