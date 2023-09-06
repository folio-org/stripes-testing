import uuid from 'uuid';
import moment from 'moment';
import TopMenu from '../../support/fragments/topMenu';
import testTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import UserEdit from '../../support/fragments/users/userEdit';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Users from '../../support/fragments/users/users';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../support/fragments/checkout/checkout';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import getRandomPostfix from '../../support/utils/stringTools';
import UserLoans from '../../support/fragments/users/loans/userLoans';

let user;
const item = {
  instanceTitle: `Instance ${getRandomPostfix()}`,
  barcode: `item-${getRandomPostfix()}`
};
const testData = {
  userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation('autotest receive notice check in', uuid()),
};

describe('circulation-log', () => {
  before('create test data', () => {
    cy.createTempUser([]).then(userProperties => {
      user = userProperties;

      ServicePoints.createViaApi(testData.userServicePoint);
      UserEdit.addServicePointViaApi(testData.userServicePoint.id,
        user.userId, testData.userServicePoint.id);

      InventoryInstances.createInstanceViaApi(item.instanceTitle, item.barcode);
      cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.barcode}"` });
      Checkout.checkoutItemViaApi({
        id: uuid(),
        itemBarcode: item.barcode,
        loanDate: moment.utc().format(),
        servicePointId: testData.userServicePoint.id,
        userBarcode: user.barcode,
      });

      const renewBody = {
        id: uuid(),
        itemBarcode: item.barcode,
        overrideBlocks: {
          comment: `override-message-${getRandomPostfix()}`,
          renewalBlock: {}
        },
        servicePointId: testData.userServicePoint.id,
        userBarcode: user.barcode,
      };

      UserLoans.getUserLoansIdViaApi(user.userId).then((userLoans) => {
        UserLoans.declareLoanLostViaApi({
          servicePointId: testData.userServicePoint.id,
          declaredLostDateTime: moment.utc().format(),
        }, userLoans.loans[0].id)
          .then(() => {
            UserLoans.renewItemViaApi(renewBody);
          });
      });
    });
    cy.loginAsAdmin({ path: TopMenu.circulationLogPath, waiter: SearchPane.waitLoading });
  });

  after('delete test data', () => {
    CheckInActions.checkinItemViaApi({
      itemBarcode: item.barcode,
      servicePointId: testData.userServicePoint.id,
      checkInDate: moment.utc().format(),
    });
    UserEdit.changeServicePointPreferenceViaApi(user.userId, [testData.userServicePoint.id]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
    Users.deleteViaApi(user.userId);
  });

  it('C17137 Filter circulation log by renewed through override (firebird)', { tags: [testTypes.criticalPath, devTeams.firebird] }, () => {
    const searchResultsData = {
      userBarcode: user.barcode,
      itemBarcode: item.barcode,
      object: 'Loan',
      circAction: 'Renewed through override',
      servicePoint: testData.userServicePoint.name,
      source: 'ADMINISTRATOR, DIKU',
    };
    SearchPane.setFilterOptionFromAccordion('loan', 'Renewed through override');
    SearchPane.verifyResultCells();
    SearchPane.checkResultSearch(searchResultsData);

    SearchPane.searchByItemBarcode(item.barcode);
    SearchPane.verifyResultCells();
    SearchPane.checkResultSearch(searchResultsData);
  });
});
