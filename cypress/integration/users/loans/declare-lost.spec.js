import { getTestEntityValue } from '../../../support/utils/stringTools';
import TestType from '../../../support/dictionary/testTypes';
import AppPaths from '../../../support/fragments/app-paths';
import { getNewItem } from '../../../support/fragments/inventory/item';
import UsersOwners, { getNewOwner } from '../../../support/fragments/settings/users/usersOwners';
import Loans from '../../../support/fragments/user/loans';
import LoanDetails from '../../../support/fragments/user/loan-details';
import ServicePoint from '../../../support/fragments/service_point/service-point';
import Checkout from '../../../support/fragments/checkout/checkout';
import UsersCard from '../../../support/fragments/users/usersCard';
import permissions from '../../../support/dictionary/permissions';

describe('ui-users-loans: Loans', () => {
  const newOwnerData = getNewOwner();
  const newFirstItemData = getNewItem();
  const newSecondItemData = getNewItem();
  const DECLARE_LOST_ADDITIONAL_INFORMATION = getTestEntityValue('Some additional information');
  const SECOND_LOAN_ROW_INDEX = 1;
  const FIRST_ACTION_ROW_INDEX = 0;
  const SECOND_ACTION_ROW_INDEX = 1;
  let testUserId;

  beforeEach(() => {
    cy.getAdminToken();

    cy.then(() => {
      ServicePoint.getViaApi();
      cy.getLoanTypes({ limit: 1 });
      cy.getMaterialTypes({ limit: 1 });
      cy.getInstanceTypes({ limit: 1 });
      cy.getLocations({ limit: 1 });
      cy.getHoldingTypes({ limit: 1 });
      cy.getHoldingSources({ limit: 1 });
    }).then(() => {
      cy.createTempUser([
        permissions.uiUsersViewLoans.gui,
        permissions.uiUsersDeclareItemLost.gui,
      ]).then(({
        username,
        password,
        userId,
        barcode: userBarcode,
      }) => {
        testUserId = userId;

        cy.addServicePointToUser(Cypress.env('servicePoints')[0].id, userId).then(() => {
          const servicePointOwner = Cypress.env('servicePoints').map(({
            id,
            name,
          }) => ({
            value: id,
            label: name,
          }));

          UsersOwners.createViaApi({
            ...newOwnerData,
            servicePointOwner,
          });

          cy.createInstance({
            instance: {
              instanceTypeId: Cypress.env('instanceTypes')[0].id,
              title: getTestEntityValue(),
            },
            holdings: [{
              holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
              permanentLocationId: Cypress.env('locations')[0].id,
              sourceId: Cypress.env('holdingSources')[0].id,
            }],
            items: [
              [{
                ...newFirstItemData,
                permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
                materialType: { id: Cypress.env('materialTypes')[0].id },
              }, {
                ...newSecondItemData,
                permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
                materialType: { id: Cypress.env('materialTypes')[0].id },
              }],
            ],
          }).then(() => {
            [
              newFirstItemData.barcode,
              newSecondItemData.barcode,
            ].forEach((itemBarcode) => {
              Checkout.createItemCheckoutApi({
                itemBarcode,
                userBarcode,
                servicePointId: Cypress.env('servicePoints')[0].id,
              });
            });

            cy.login(username, password);

            cy.visit(AppPaths.getOpenLoansPath(userId));
          });
        });
      });
    });
  });

  it('C9191: Declare lost', { tags: [TestType.smoke] }, () => {
    UsersCard.getApi(testUserId).then((user) => {
      Loans.getApi(testUserId).then(([firstLoan, secondLoan]) => {
        Loans.checkStatusCheckedOut(SECOND_LOAN_ROW_INDEX);
        Loans.startDeclareLost(SECOND_LOAN_ROW_INDEX);
        Loans.cancelDeclareLost();
        Loans.checkStatusCheckedOut(SECOND_LOAN_ROW_INDEX);

        Loans.startDeclareLost(SECOND_LOAN_ROW_INDEX);
        Loans.finishDeclareLost(DECLARE_LOST_ADDITIONAL_INFORMATION);
        Loans.checkStatusDeclaredLost(SECOND_LOAN_ROW_INDEX);

        const testLoanDetails = (shouldDeclareLost, loanId, loanHistoryFirstAction) => {
          cy.visit(AppPaths.getLoanDetailsPath(testUserId, loanId));

          if (shouldDeclareLost) {
            LoanDetails.checkDeclareLostButtonActive();
            LoanDetails.startDeclareLost();
            LoanDetails.finishDeclareLost(DECLARE_LOST_ADDITIONAL_INFORMATION);
          }

          LoanDetails.checkDeclareLostButtonDisabled();
          LoanDetails.checkStatusDeclaredLost();
          LoanDetails.checkLostDate(loanHistoryFirstAction.loan.metadata.updatedDate);
          LoanDetails.checkActionDate(
            FIRST_ACTION_ROW_INDEX,
            loanHistoryFirstAction.loan.metadata.updatedDate
          );

          LoanDetails.checkActionDeclaredLost(FIRST_ACTION_ROW_INDEX);
          LoanDetails.checkLoansActionsHaveSameDueDate(
            FIRST_ACTION_ROW_INDEX,
            SECOND_ACTION_ROW_INDEX,
            loanHistoryFirstAction.loan.dueDate
          );
          LoanDetails.checkStatusDeclaredLostInList(FIRST_ACTION_ROW_INDEX);
          LoanDetails.checkSource(FIRST_ACTION_ROW_INDEX, user);
          LoanDetails.checkComments(FIRST_ACTION_ROW_INDEX, DECLARE_LOST_ADDITIONAL_INFORMATION);
        };

        cy.getLoanHistory(secondLoan.id).then(([loanHistoryFirstAction]) => {
          testLoanDetails(false, secondLoan.id, loanHistoryFirstAction);
        });

        cy.getLoanHistory(firstLoan.id).then(([loanHistoryFirstAction]) => {
          testLoanDetails(true, firstLoan.id, loanHistoryFirstAction);
        });
      });
    });
  });
});
