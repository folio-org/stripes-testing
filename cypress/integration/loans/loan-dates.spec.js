import TopMenu from '../../support/fragments/topMenu';
import TestTypes from '../../support/dictionary/testTypes';
import getRandomPostfix from '../../support/utils/stringTools';
import permissions from '../../support/dictionary/permissions';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';
import LoansPage from '../../support/fragments/loans/loansPage';
import ChangeDueDateForm from '../../support/fragments/loans/changeDueDateForm';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import DateTools from '../../support/utils/dateTools';
import NewRequest from '../../support/fragments/requests/newRequest';
import CheckinActions from '../../support/fragments/check-in-actions/checkInActions';
import ConfirmMultiplePiecesItemCheckOut from '../../support/fragments/checkout/confirmMultipieceCheckOutModal';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import UsersEditPage from '../../support/fragments/users/usersEditPage';
import Checkout from '../../support/fragments/checkout/checkout';

const item = {
  barcode: `123${getRandomPostfix()}`,
  title: `Loans test ${Number(new Date())}`
};
let checkOutUser;
const checkInUser = {};
const expirationUserDate = DateTools.getFutureWeekDateObj();


describe('loan dates', () => {
  before('create inventory instance', () => {
    let source;

    cy.createTempUser([
      permissions.loansAll.gui,
      permissions.checkoutAll.gui,
      permissions.requestsAll.gui,
    ])
      .then(userProperties => {
        checkOutUser = userProperties;
        cy.getAdminToken()
          .then(() => {
            cy.getLoanTypes({ limit: 1 });
            cy.getMaterialTypes({ limit: 1 });
            cy.getLocations({ limit: 1 });
            cy.getHoldingTypes({ limit: 1 });
            source = InventoryHoldings.getHoldingSources({ limit: 1 });
            cy.getInstanceTypes({ limit: 1 });
            cy.getServicePointsApi({ limit: 1, query: 'pickupLocation=="true"' });
            cy.getUsers({
              limit: 1,
              query: `"personal.lastName"="${userProperties.username}" and "active"="true"`
            });
          })
          .then(() => {
            UsersEditPage.addServicePointToUser([Cypress.env('servicePoints')[0].id], userProperties.userId);
            cy.getUserServicePoints(Cypress.env('users')[0].id);
            cy.createInstance({
              instance: {
                instanceTypeId: Cypress.env('instanceTypes')[0].id,
                title: item.title,
              },
              holdings: [{
                holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
                permanentLocationId: Cypress.env('locations')[0].id,
                sourceId: source.id,
              }],
              items: [
                [{
                  barcode: item.barcode,
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
            cy.login(userProperties.username, userProperties.password, { path: TopMenu.checkOutPath, waiter: Checkout.waitLoading });
            CheckOutActions.checkOutItem(Cypress.env('users')[0].barcode, item.barcode);
            ConfirmMultiplePiecesItemCheckOut.confirmMultiplePiecesItemModal();
            CheckOutActions.endCheckOutSession();
            cy.updateUser({ ...Cypress.env('users')[0], expirationDate: DateTools.getFormattedDate({ date: expirationUserDate }) });
          })
          .then(() => {
            cy.getUsers({ limit: 1, query: '"barcode"="" and "active"="true"' })
              .then((users) => {
                checkInUser.barcode = users[0].barcode;
              });
          });
      });
  });

  after('Delete all data', () => {
    CheckinActions.createItemCheckinApi({
      itemBarcode: item.barcode,
      servicePointId: Cypress.env('servicePoints')[0].id,
      checkInDate: '2021-09-30T16:14:50.444Z',
    });
    cy.getInstance({ limit: 1, expandAll: true, query: `"items.barcode"=="${item.barcode}"` })
      .then((instance) => {
        cy.deleteItem(instance.items[0].id);
        cy.deleteHoldingRecord(instance.holdings[0].id);
        cy.deleteInstanceApi(instance.id);
      });
    cy.deleteUser(checkOutUser.userId);
  });

  it('C1566 Loan: Change due date warnings and alerts', { tags: [TestTypes.smoke] }, () => {
    cy.visit(TopMenu.usersPath);
    // show open loans
    UsersSearchPane.searchByKeywords(checkOutUser.username);
    UsersSearchPane.openUser(checkOutUser.userId);
    UsersCard.openLoans();
    UsersCard.showOpenedLoans();

    // change date to past and verify warning
    LoansPage.openChangeDueDateForm();
    ChangeDueDateForm.fillDate('04/19/2022');
    ChangeDueDateForm.verifyWarning('New due date is in the past.');
    ChangeDueDateForm.saveAndClose();

    // change date to date after patron's expiration and verify warning
    const loanDateAfterExpirationUser = new Date(expirationUserDate.getFullYear(), expirationUserDate.getMonth(), expirationUserDate.getDate() + 7);
    LoansPage.openChangeDueDateForm();
    ChangeDueDateForm.fillDate(DateTools.getFormattedDate({ date: loanDateAfterExpirationUser }, 'MM/DD/YYYY'));
    ChangeDueDateForm.verifyWarning('New due date is after patron\'s expiration.');
    ChangeDueDateForm.saveAndClose();
    LoansPage.closePage();

    // create request
    cy.visit(TopMenu.requestsPath);
    NewRequest.createNewRequest({
      itemBarcode: item.barcode,
      itemTitle: item.title,
      requesterBarcode: checkInUser.barcode,
      pickupServicePoint: 'Circ Desk 1',
    });

    // go to changing due date and verify warning
    cy.visit(TopMenu.usersPath);
    UsersSearchPane.searchByKeywords(checkOutUser.username);
    UsersSearchPane.openUser(checkOutUser.userId);
    UsersCard.openLoans();
    UsersCard.showOpenedLoans();
    LoansPage.openChangeDueDateForm();
    ChangeDueDateForm.verifyRequestsCount('1');
    // Bug UIU-2586
    // ChangeDueDateForm.verifyWarning('Item has been recalled');
  });
});
