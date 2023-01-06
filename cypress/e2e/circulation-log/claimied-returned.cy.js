import TopMenu from '../../support/fragments/topMenu';
import TestTypes from '../../support/dictionary/testTypes';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import getRandomPostfix from '../../support/utils/stringTools';
import permissions from '../../support/dictionary/permissions';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';
import CheckinActions from '../../support/fragments/check-in-actions/checkInActions';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import devTeams from '../../support/dictionary/devTeams';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import Checkout from '../../support/fragments/checkout/checkout';
import LoansPage from '../../support/fragments/loans/loansPage';

const ITEM_BARCODE = `123${getRandomPostfix()}`;
let userId;
let source;
let servicePointId;

describe('circulation-log', () => {
  before('create checked out item', () => {
    cy.createTempUser([
      permissions.inventoryAll.gui,
      permissions.circulationLogAll.gui,
      permissions.usersViewRequests.gui
    ])
      .then(userProperties => {
        userId = userProperties.userId;
        cy.login(userProperties.username, userProperties.password);
        cy.visit(TopMenu.circulationLogPath);
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
            cy.createInstance({
              instance: {
                instanceTypeId: Cypress.env('instanceTypes')[0].id,
                title: `Barcode search test ${Number(new Date())}`,
              },
              holdings: [{
                holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
                permanentLocationId: Cypress.env('locations')[0].id,
                sourceId: source.id,
              }],
              items: [
                [{
                  barcode: ITEM_BARCODE,
                  missingPieces: '3',
                  numberOfMissingPieces: '3',
                  status: { name: 'Available' },
                  permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
                  materialType: { id: Cypress.env('materialTypes')[0].id },
                }],
              ],
            });
          })
          .then(() => {
            Checkout.checkoutItemViaApi({
              itemBarcode: ITEM_BARCODE,
              userBarcode: Cypress.env('users')[0].barcode,
              servicePointId,
            });
          });
          cy.loginAsAdmin();
          cy.visit(TopMenu.usersPath);
      });

  });

  after('delete test data', () => {
    CheckinActions.checkinItemViaApi({
      itemBarcode: ITEM_BARCODE,
      servicePointId,
      checkInDate: new Date().toISOString(),
    })
      .then(() => {
        cy.getInstance({ limit: 1, expandAll: true, query: `"items.barcode"=="${ITEM_BARCODE}"` })
          .then((instance) => {
            cy.deleteItem(instance.items[0].id);
            cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
            InventoryInstance.deleteInstanceViaApi(instance.id);
          });
        cy.getBlockApi(userId).then(() => {
          cy.deleteBlockApi(Cypress.env('blockIds')[0].id);
        });
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
        itemBarcode: ITEM_BARCODE,
        circAction: 'Claimed returned',
      });
    SearchPane.resetResults();

    SearchPane.searchByItemBarcode(ITEM_BARCODE);
    SearchPane.checkResultSearch({
        itemBarcode: ITEM_BARCODE,
        circAction: 'Claimed returned',
      });
  })
});