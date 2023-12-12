import moment from 'moment';
import TopMenu from '../../support/fragments/topMenu';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import getRandomPostfix from '../../support/utils/stringTools';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Checkout from '../../support/fragments/checkout/checkout';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import InventoryItems from '../../support/fragments/inventory/item/inventoryItems';

let user;
let servicePointId;
const item = {
  name: `ItemName${getRandomPostfix()}`,
  barcode: `123${getRandomPostfix()}`,
};

describe('circulation-log', () => {
  before('creating user and checking out item', () => {
    cy.createTempUser([]).then((userProperties) => {
      user = userProperties;
      ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' })
        .then((res) => {
          servicePointId = res[0].id;
        })
        .then(() => {
          UserEdit.addServicePointViaApi(servicePointId, user.userId);
          InventoryInstances.createInstanceViaApi(item.name, item.barcode);
        })
        .then(() => {
          Checkout.checkoutItemViaApi({
            itemBarcode: item.barcode,
            userBarcode: user.barcode,
            servicePointId,
          });
        })
        .then(() => {
          UserLoans.getUserLoansIdViaApi(user.userId).then((userLoans) => {
            userLoans.loans.forEach(({ id }) => {
              UserLoans.claimItemReturnedViaApi(
                { itemClaimedReturnedDateTime: moment.utc().format() },
                id,
              );
            });
          });
        });
      InventoryItems.markItemAsMissingByUserIdViaApi(user.userId);
      cy.loginAsAdmin({ path: TopMenu.circulationLogPath, waiter: SearchPane.waitLoading });
    });
  });

  after('cleaning up test data', () => {
    cy.getAdminToken();
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C17001 Filter circulation log by marked as missing (firebird)',
    { tags: ['criticalPath', 'firebird'] },
    () => {
      SearchPane.searchByMarkedAsMissing();
      SearchPane.verifyResultCells();
      SearchPane.findResultRowIndexByContent(item.barcode).then((rowIndex) => {
        SearchPane.checkResultSearch(
          {
            itemBarcode: item.barcode,
            circAction: 'Marked as missing',
          },
          rowIndex,
        );
      });
      SearchPane.resetResults();

      SearchPane.searchByItemBarcode(item.barcode);
      SearchPane.findResultRowIndexByContent(item.barcode).then((rowIndex) => {
        SearchPane.checkResultSearch(
          {
            itemBarcode: item.barcode,
            circAction: 'Marked as missing',
          },
          rowIndex,
        );
      });
    },
  );

  it(
    'C17002 Check the Actions button from filtering Circulation log by marked as missing (firebird)',
    { tags: ['criticalPath', 'firebird'] },
    () => {
      SearchPane.searchByMarkedAsMissing();
      SearchPane.checkActionButtonAfterFiltering(user.firstName, item.barcode);
    },
  );
});
