import Checkout from '../../support/fragments/checkout/checkout';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../support/fragments/inventory/item/inventoryItems';
import LoansPage from '../../support/fragments/loans/loansPage';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import ConfirmClaimReturnedModal from '../../support/fragments/users/loans/confirmClaimReturnedModal';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../support/utils/stringTools';
import { APPLICATION_NAMES } from '../../support/constants';

let user;
let servicePointId;
const item = {
  instanceName: `Barcode search test ${Number(new Date())}`,
  ITEM_BARCODE: `123${getRandomPostfix()}`,
};

describe('Circulation log', () => {
  before('create checked out item', () => {
    cy.createTempUser().then((userProperties) => {
      user = userProperties;
      ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' }).then((res) => {
        servicePointId = res[0].id;
      });
      cy.getUsers({
        limit: 1,
        query: `username=${userProperties.username}`,
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
    'C16997 Filter circulation log by Claimed returned (volaris)',
    { tags: ['criticalPath', 'volaris', 'C16997'] },
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

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CIRCULATION_LOG);

      SearchPane.searchByClaimedReturned();
      SearchPane.verifyResultCells();

      const expectedItemData = {
        itemBarcode: item.ITEM_BARCODE,
        circAction: 'Claimed returned',
      };

      SearchPane.findResultRowIndexByContent(item.ITEM_BARCODE).then((rowIndex) => {
        SearchPane.checkResultSearch(expectedItemData, rowIndex);
      });
      SearchPane.resetResults();

      SearchPane.searchByItemBarcode(item.ITEM_BARCODE);
      SearchPane.findResultRowIndexByContent(item.ITEM_BARCODE).then((rowIndex) => {
        SearchPane.checkResultSearch(expectedItemData, rowIndex);
      });
    },
  );

  it(
    'C16998 Check the Actions button from filtering Circulation log by claimed returned (volaris)',
    { tags: ['criticalPath', 'volaris', 'C16998'] },
    () => {
      SearchPane.setFilterOptionFromAccordion('loan', 'Claimed returned');
      SearchPane.checkActionButtonAfterFiltering(user.firstName, item.ITEM_BARCODE);
    },
  );
});
