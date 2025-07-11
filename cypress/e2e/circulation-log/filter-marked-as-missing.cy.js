import moment from 'moment';
import Checkout from '../../support/fragments/checkout/checkout';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../support/utils/stringTools';
import { APPLICATION_NAMES } from '../../support/constants';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';

let user;
let servicePointId;
const item = {
  name: `ItemName${getRandomPostfix()}`,
  barcode: `123${getRandomPostfix()}`,
};

describe('Circulation log', () => {
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
      cy.loginAsAdmin({ path: TopMenu.usersPath, waiter: UsersSearchPane.waitLoading });
    });
  });

  after('cleaning up test data', () => {
    cy.getAdminToken();
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C17001 Filter circulation log by marked as missing (volaris)',
    {
      tags: ['criticalPath', 'volaris', 'C17001'],
      retries: 2,
    },
    () => {
      UsersSearchPane.searchByKeywords(user.userId);
      UsersSearchPane.openUser(user.userId);
      UsersCard.viewCurrentLoans();
      const ConfirmItemStatusModal = UserLoans.markAsMissing(item.barcode);
      ConfirmItemStatusModal.confirmItemStatus('this is a test');

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CIRCULATION_LOG);
      cy.wait(3000);
      SearchPane.searchByMarkedAsMissing();
      SearchPane.verifyResultCells();
      SearchPane.checkResultSearch({
        itemBarcode: item.barcode,
        circAction: 'Marked as missing',
      });
      SearchPane.resetResults();

      SearchPane.searchByItemBarcode(item.barcode);
      SearchPane.checkResultSearch({
        itemBarcode: item.barcode,
        circAction: 'Marked as missing',
      });
    },
  );

  it(
    'C17002 Check the Actions button from filtering Circulation log by marked as missing (volaris)',
    { tags: ['criticalPath', 'volaris', 'C17002'] },
    () => {
      SearchPane.searchByMarkedAsMissing();
      SearchPane.checkActionButtonAfterFiltering(user.firstName, item.barcode);
    },
  );
});
