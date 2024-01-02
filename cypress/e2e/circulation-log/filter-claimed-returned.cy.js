import Checkout from '../../support/fragments/checkout/checkout';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../support/fragments/inventory/item/inventoryItems';
import LoansPage from '../../support/fragments/loans/loansPage';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import ConfirmClaimReturnedModal from '../../support/fragments/users/loans/confirmClaimReturnedModal';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../support/utils/stringTools';

let user;
let servicePointId;
const item = {
  instanceName: `Barcode search test ${Number(new Date())}`,
  ITEM_BARCODE: `123${getRandomPostfix()}`,
};

describe('circulation-log', () => {
  before('create checked out item', () => {
    cy.createTempUser().then((userProperties) => {
      user = userProperties;
      ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' }).then((res) => {
        servicePointId = res[0].id;
      });
      cy.getUsers({
        limit: 1,
        query: `"personal.lastName"="${userProperties.username}" and "active"="true"`,
      })
        .then(() => {
          UserEdit.addServicePointViaApi(servicePointId, user.userId);
          cy.getUserServicePoints(Cypress.env('users')[0].id);
          InventoryInstances.createInstanceViaApi(item.instanceName, item.ITEM_BARCODE);
        })
        .then(() => {
          Checkout.checkoutItemViaApi({
            itemBarcode: item.ITEM_BARCODE,
            userBarcode: Cypress.env('users')[0].barcode,
            servicePointId,
          });
        });
      cy.loginAsAdmin({ path: TopMenu.usersPath, waiter: UsersSearchPane.waitLoading });
    });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    InventoryItems.markItemAsMissingByUserIdViaApi(user.userId).then(() => {
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.ITEM_BARCODE);
      Users.deleteViaApi(user.userId);
    });
  });

  it(
    'C16997 Filter circulation log by Claimed returned (firebird)',
    { tags: ['criticalPath', 'firebird'] },
    () => {
      UsersSearchPane.searchByStatus('Active');
      UsersSearchPane.searchByKeywords(user.userId);
      UsersSearchPane.openUser(user.userId);
      UsersCard.viewCurrentLoans();
      LoansPage.checkAll();
      UserLoans.openClaimReturnedPane();
      ConfirmClaimReturnedModal.confirmItemStatus(
        'C16997 Filter circulation log by Claimed returned',
      );

      cy.visit(TopMenu.circulationLogPath);

      SearchPane.searchByClaimedReturned();
      SearchPane.verifyResultCells();
      SearchPane.checkResultSearch({
        itemBarcode: item.ITEM_BARCODE,
        circAction: 'Claimed returned',
      });
      SearchPane.resetResults();

      SearchPane.searchByItemBarcode(item.ITEM_BARCODE);
      SearchPane.checkResultSearch({
        itemBarcode: item.ITEM_BARCODE,
        circAction: 'Claimed returned',
      });
    },
  );

  it(
    'C16998 Check the Actions button from filtering Circulation log by claimed returned (firebird)',
    { tags: ['criticalPath', 'firebird'] },
    () => {
      SearchPane.setFilterOptionFromAccordion('loan', 'Claimed returned');
      SearchPane.checkActionButtonAfterFiltering(user.firstName, item.ITEM_BARCODE);
    },
  );
});
