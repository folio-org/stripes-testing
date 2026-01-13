import moment from 'moment';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../support/fragments/checkout/checkout';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import TopMenu from '../../support/fragments/topMenu';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

let user;
const item = {
  instanceName: `instance-name-${getRandomPostfix()}`,
  barcode: `barcode-${getRandomPostfix()}`,
};
const testData = {
  userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
};
const ownerBody = {
  owner: 'AutotestOwner' + getRandomPostfix(),
  servicePointOwner: [
    {
      value: testData.userServicePoint.id,
      label: testData.userServicePoint.name,
    },
  ],
};

describe('Circulation log', () => {
  before('create test data', () => {
    cy.createTempUser([]).then((userProperties) => {
      user = userProperties;
      ServicePoints.createViaApi(testData.userServicePoint);
      testData.defaultLocation = Location.getDefaultLocation(testData.userServicePoint.id);
      Location.createViaApi(testData.defaultLocation);
      UserEdit.addServicePointViaApi(testData.userServicePoint.id, user.userId);

      item.instanceId = InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
      cy.getHoldings({ limit: 1, query: `"instanceId"="${item.instanceId}"` }).then((holdings) => {
        cy.updateHoldingRecord(holdings[0].id, {
          ...holdings[0],
          permanentLocationId: testData.defaultLocation.id,
        });
      });

      Checkout.checkoutItemViaApi({
        itemBarcode: item.barcode,
        userBarcode: user.barcode,
        servicePointId: testData.userServicePoint.id,
      });

      UsersOwners.createViaApi(ownerBody).then((ownerResponse) => {
        testData.ownerId = ownerResponse.id;
      });
      UserLoans.getUserLoansIdViaApi(user.userId).then((userLoans) => {
        UserLoans.declareLoanLostViaApi(
          {
            servicePointId: testData.userServicePoint.id,
            declaredLostDateTime: moment.utc().format(),
          },
          userLoans.loans[0].id,
        );
      });
    });
    cy.loginAsAdmin({ path: TopMenu.circulationLogPath, waiter: SearchPane.waitLoading });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    CheckInActions.checkinItemViaApi({
      itemBarcode: item.barcode,
      servicePointId: testData.userServicePoint.id,
      checkInDate: new Date().toISOString(),
    });
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
    Users.deleteViaApi(user.userId);
    UsersOwners.deleteViaApi(testData.ownerId);
  });

  it(
    'C17135 Filter circulation log by declared lost (volaris)',
    { tags: ['criticalPath', 'volaris', 'C17135'] },
    () => {
      const searchResults = {
        itemBarcode: item.barcode,
        circAction: 'Declared lost',
      };
      SearchPane.setFilterOptionFromAccordion('loan', 'Declared lost');
      SearchPane.verifyResultCells();
      SearchPane.findResultRowIndexByContent(item.barcode).then((rowIndex) => {
        SearchPane.checkResultSearch(searchResults, rowIndex);
      });
      SearchPane.resetResults();

      SearchPane.searchByItemBarcode(item.barcode);
      SearchPane.findResultRowIndexByContent(item.barcode).then((rowIndex) => {
        SearchPane.checkResultSearch(searchResults, rowIndex);
      });
    },
  );

  it(
    'C45934 Check the Actions button from filtering Circulation log by declared lost (volaris)',
    { tags: ['criticalPath', 'volaris', 'C45934'] },
    () => {
      SearchPane.setFilterOptionFromAccordion('loan', 'Declared lost');
      SearchPane.checkActionButtonAfterFiltering(user.firstName, item.barcode);
    },
  );
});
