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
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';

let user;
const item = {
  instanceName: `instance-name-${getRandomPostfix()}`,
  barcode: `barcode-${getRandomPostfix()}`,
};
const testData = {
  userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(
    'autotest lost items',
    uuid(),
  ),
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

describe('circulation-log', () => {
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

      UsersOwners.createViaApi(ownerBody);

      const renewBody = {
        id: uuid(),
        itemBarcode: item.barcode,
        overrideBlocks: {
          comment: `override-message-${getRandomPostfix()}`,
          renewalBlock: {},
        },
        servicePointId: testData.userServicePoint.id,
        userBarcode: user.barcode,
      };

      UserLoans.getUserLoansIdViaApi(user.userId).then((userLoans) => {
        UserLoans.declareLoanLostViaApi(
          {
            servicePointId: testData.userServicePoint.id,
            declaredLostDateTime: moment.utc().format(),
          },
          userLoans.loans[0].id,
        ).then(() => {
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

  it(
    'C17137 Filter circulation log by renewed through override (firebird)',
    { tags: [testTypes.criticalPath, devTeams.firebird] },
    () => {
      const searchResultsData = {
        userBarcode: user.barcode,
        itemBarcode: item.barcode,
        object: 'Loan',
        circAction: 'Renewed through override',
        servicePoint: testData.userServicePoint.name,
        source: 'ADMINISTRATOR, Diku_admin',
      };
      SearchPane.setFilterOptionFromAccordion('loan', 'Renewed through override');
      SearchPane.verifyResultCells();
      SearchPane.checkResultSearch(searchResultsData);

      SearchPane.searchByItemBarcode(item.barcode);
      SearchPane.verifyResultCells();
      SearchPane.checkResultSearch(searchResultsData);
    },
  );
});
