import moment from 'moment';
import TopMenu from '../../support/fragments/topMenu';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import getRandomPostfix from '../../support/utils/stringTools';
import permissions from '../../support/dictionary/permissions';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';
import devTeams from '../../support/dictionary/devTeams';
import testTypes from '../../support/dictionary/testTypes';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Checkout from '../../support/fragments/checkout/checkout';
import LoansPage from '../../support/fragments/loans/loansPage';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import CheckinActions from '../../support/fragments/check-in-actions/checkInActions';

let user;
let servicePointId;
const item = {
  name: `ItemName${getRandomPostfix()}`,
  barcode: `123${getRandomPostfix()}`,
};

describe('circulation-log', () => {
  before('creating user and checking out item', () => {
    cy.createTempUser([
      permissions.inventoryAll.gui,
      permissions.circulationLogAll.gui,
      permissions.checkoutAll.gui,
      permissions.uiUsersViewLoans.gui,
      permissions.uiUsersLoansClaimReturned.gui,
    ])
      .then(userProperties => {
        user = { ...userProperties };
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
                UserLoans.claimItemReturnedViaApi({ itemClaimedReturnedDateTime: moment.utc().format() }, id);
              });
            });
          });
        cy.loginAsAdmin({ path: TopMenu.usersPath, waiter: UsersSearchPane.waitLoading });
      });
  });

  after('cleaning up test data', () => {
    CheckinActions.checkinItemViaApi({
      itemBarcode: item.barcode,
      servicePointId,
      checkInDate: new Date().toISOString(),
    })
      .then(() => {
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
        Users.deleteViaApi(user.userId);
      });
  });

  it('C17001 Filter circulation log by marked as missing (firebird)', { tags: [testTypes.criticalPath, devTeams.firebird] }, () => {
    UsersSearchPane.searchByKeywords(user.userId);
    UsersSearchPane.openUser(user.userId);
    UsersCard.openLoans();
    UsersCard.showOpenedLoans();
    LoansPage.markItemAsMissing(item.barcode, 'this is a test');

    cy.visit(TopMenu.circulationLogPath);
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
  });
});
