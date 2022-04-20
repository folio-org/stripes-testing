import TopMenu from '../../support/fragments/topMenu';
import TestTypes from '../../support/dictionary/testTypes';
import getRandomPostfix from '../../support/utils/stringTools';
import permissions from '../../support/dictionary/permissions';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';
import LoansPage from '../../support/fragments/loans/loansPage';
import ChangeDueDateForm from '../../support/fragments/loans/changeDueDateForm';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';

const ITEM_BARCODE = `123${getRandomPostfix()}`;
let user;


describe('loan dates', () => {
  before('create inventory instance', () => {
    cy.createTempUser([
      permissions.inventoryAll.gui,
      permissions.circulationLogAll.gui,
      permissions.loansAll.gui,
      permissions.checkoutAll.gui,
      permissions.checkinAll.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'))
          .then(() => {
            cy.getLoanTypes({ limit: 1 });
            cy.getMaterialTypes({ limit: 1 });
            cy.getLocations({ limit: 1 });
            cy.getHoldingTypes({ limit: 1 });
            cy.getHoldingSources({ limit: 1 });
            cy.getInstanceTypes({ limit: 1 });
            cy.getServicePointsApi({ limit: 1, query: 'pickupLocation=="true"' });
            cy.getUsers({
              limit: 1,
              query: `"personal.lastName"="${userProperties.username}" and "active"="true"`
            });
          })
          .then(() => {
            cy.addServicePointToUser(Cypress.env('servicePoints')[0].id, userProperties.userId);
            cy.getUserServicePoints(Cypress.env('users')[0].id);
            cy.createInstance({
              instance: {
                instanceTypeId: Cypress.env('instanceTypes')[0].id,
                title: `Barcode search test ${Number(new Date())}`,
              },
              holdings: [{
                holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
                permanentLocationId: Cypress.env('locations')[0].id,
                sourceId: Cypress.env('holdingSources')[0].id,
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
            cy.login(userProperties.username, userProperties.password);
            CheckOutActions.checkOutItem(Cypress.env('users')[0].barcode, ITEM_BARCODE);
          });
      });
  });

  after('Delete all data', () => {
    cy.createItemCheckinApi({
      itemBarcode: ITEM_BARCODE,
      servicePointId: Cypress.env('servicePoints')[0].id,
      checkInDate: '2021-09-30T16:14:50.444Z',
    });
    cy.getInstance({ limit: 1, expandAll: true, query: `"items.barcode"=="${ITEM_BARCODE}"` })
      .then((instance) => {
        cy.deleteItem(instance.items[0].id);
        cy.deleteHoldingRecord(instance.holdings[0].id);
        cy.deleteInstanceApi(instance.id);
      });
    cy.deleteUser(user.userId);
  });

  it('C1566 Loan: Change due date warnings and alerts', { tags: [TestTypes.smoke] }, () => {
    cy.visit(TopMenu.usersPath);

    // show open loans
    UsersSearchPane.searchByKeywords(user.username);
    UsersSearchPane.openUser(user.userId);
    UsersCard.openLoans();
    UsersCard.showOpenedLoans();

    // change date to past and verify warning
    LoansPage.openChangeDueDateForm();
    ChangeDueDateForm.fillDate('04/19/2022');
    ChangeDueDateForm.verifyWarning('New due date is in the past.');
    ChangeDueDateForm.saveAndClose();

    // change date to date after patron's expiration
    LoansPage.openChangeDueDateForm();
    ChangeDueDateForm.fillDate('04/19/9999');
    // ChangeDueDateForm.verifyWarning('New due date is in the past.');
    // ChangeDueDateForm.saveAndClose();
  });
});
