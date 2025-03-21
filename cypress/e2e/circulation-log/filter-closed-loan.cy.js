import moment from 'moment';
import uuid from 'uuid';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../support/fragments/checkout/checkout';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

let user;
const item = {
  instanceTitle: `AT_C16999_Instance_${getRandomPostfix()}`,
  barcode: `item-${getRandomPostfix()}`,
};
const testData = {
  userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(
    'autotest receive notice check in',
    uuid(),
  ),
};

describe('Circulation log', () => {
  before('create test data', () => {
    cy.createTempUser([]).then((userProperties) => {
      user = userProperties;

      ServicePoints.createViaApi(testData.userServicePoint);
      UserEdit.addServicePointViaApi(
        testData.userServicePoint.id,
        user.userId,
        testData.userServicePoint.id,
      );

      InventoryInstances.createInstanceViaApi(item.instanceTitle, item.barcode);
      Checkout.checkoutItemViaApi({
        itemBarcode: item.barcode,
        servicePointId: testData.userServicePoint.id,
        userBarcode: user.barcode,
      });

      CheckInActions.checkinItemViaApi({
        itemBarcode: item.barcode,
        servicePointId: testData.userServicePoint.id,
        checkInDate: moment.utc().format(),
      });
    });
    cy.getAdminSourceRecord().then((record) => {
      testData.adminSourceRecord = record;
    });
    cy.loginAsAdmin({ path: TopMenu.circulationLogPath, waiter: SearchPane.waitLoading });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    UserEdit.changeServicePointPreferenceViaApi(user.userId, [testData.userServicePoint.id]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C16999 Filter circulation log by Closed loan (volaris)',
    { tags: ['criticalPath', 'volaris', 'C16999'] },
    () => {
      const searchResultsData = {
        userBarcode: user.barcode,
        itemBarcode: item.barcode,
        object: 'Loan',
        circAction: 'Closed loan',
        servicePoint: testData.userServicePoint.name,
        source: testData.adminSourceRecord,
      };
      SearchPane.setFilterOptionFromAccordion('loan', 'Closed loan');
      SearchPane.verifyResultCells();
      SearchPane.findResultRowIndexByContent(item.barcode).then((rowIndex) => {
        SearchPane.checkResultSearch(searchResultsData, rowIndex);
      });

      SearchPane.searchByItemBarcode(item.barcode);
      cy.wait(3000);
      SearchPane.verifyResultCells();
      SearchPane.findResultRowIndexByContent(item.barcode).then((rowIndex) => {
        SearchPane.checkResultSearch(searchResultsData, rowIndex);
      });
    },
  );
});
