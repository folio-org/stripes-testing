import TopMenu from '../../support/fragments/topMenu';
import TestTypes from '../../support/dictionary/testTypes';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import getRandomPostfix from '../../support/utils/stringTools';
import permissions from '../../support/dictionary/permissions';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import devTeams from '../../support/dictionary/devTeams';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Checkout from '../../support/fragments/checkout/checkout';
import LoansPage from '../../support/fragments/loans/loansPage';
import ItemsOperations from '../../support/fragments/inventory/inventoryItem/itemsOperations';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import inventoryInstances from '../../support/fragments/inventory/inventoryInstances';

let userId;
let source;
let servicePointId;
const item = {
  instanceName: `Barcode search test ${Number(new Date())}`,
  ITEM_BARCODE: `123${getRandomPostfix()}`,
};


describe('circulation-log', () => {
  before('create checked out item', () => {
    cy.createTempUser([
      permissions.inventoryAll.gui,
      permissions.circulationLogAll.gui,
      permissions.usersViewRequests.gui
    ])
      .then(userProperties => {
        userId = userProperties.userId;
        cy.login(userProperties.username, userProperties.password, { path: TopMenu.circulationLogPath, waiter: SearchPane.waitLoading });
        cy.getAdminToken()
          .then(() => {
            cy.getLoanTypes({ limit: 1 });
            cy.getMaterialTypes({ limit: 1 });
            cy.getLocations({ limit: 1 });
            cy.getHoldingTypes({ limit: 1 });
            source = InventoryHoldings.getHoldingSources({ limit: 1 });
            cy.getInstanceTypes({ limit: 1 });
            ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' })
              .then((res) => {
                servicePointId = res[0].id;
              });
            cy.getUsers({
              limit: 1,
              query: `"personal.lastName"="${userProperties.username}" and "active"="true"`
            });
          })
          .then(() => {
            UserEdit.addServicePointViaApi(servicePointId, userId);
            cy.getUserServicePoints(Cypress.env('users')[0].id);
            inventoryInstances.createInstanceViaApi(item.instanceName, item.ITEM_BARCODE);
          })
          .then(() => {
            Checkout.checkoutItemViaApi({
              itemBarcode: item.ITEM_BARCODE,
              userBarcode: Cypress.env('users')[0].barcode,
              servicePointId,
            });
          });
        cy.loginAsAdmin();
        cy.visit(TopMenu.usersPath);
        // cy.loginAsAdmin({ path: TopMenu.usersPath, waiter: UsersSearchPane.waitLoading })
        //produces error with loans
      });
  });

  after('delete test data', () => {
    ItemsOperations.markItemAsMissingByUserId(userId).then(() => {
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.ITEM_BARCODE);
      Users.deleteViaApi(userId);
    });
  });

  it('C16997 Filter circulation log by Claimed returned (firebird)', { tags: [TestTypes.criticalPath, devTeams.firebird] }, () => {
    UsersSearchPane.searchByStatus('Active');
    UsersSearchPane.searchByKeywords(userId);
    UsersSearchPane.openUser(userId);
    UsersCard.openLoans();
    UsersCard.showOpenedLoans();
    LoansPage.checkAll();
    LoansPage.claimReturnedAndConfirm('C16997 Filter circulation log by Claimed returned');

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
  });
});
