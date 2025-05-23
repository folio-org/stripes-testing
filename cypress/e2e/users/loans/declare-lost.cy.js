import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import AppPaths from '../../../support/fragments/app-paths';
import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../../support/fragments/checkout/checkout';
import CirculationRules from '../../../support/fragments/circulation/circulation-rules';
import LostItemFeePolicy from '../../../support/fragments/circulation/lost-item-fee-policy';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { getNewItem } from '../../../support/fragments/inventory/item';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UsersOwners from '../../../support/fragments/settings/users/usersOwners';
import LoanDetails from '../../../support/fragments/users/userDefaultObjects/loanDetails';
import Loans from '../../../support/fragments/users/userDefaultObjects/loans';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Loans', () => {
  describe(
    'Loans: Declare lost',
    {
      retries: {
        runMode: 1,
      },
    },
    () => {
      const SECOND_LOAN_ROW_INDEX = 1;
      const FIRST_ACTION_ROW_INDEX = 0;
      const SECOND_ACTION_ROW_INDEX = 1;
      const itemsData = {};
      let newOwnerData;
      let newFirstItemData;
      let newSecondItemData;
      let DECLARE_LOST_ADDITIONAL_INFORMATION;
      let testData;
      let lostItemFeePolicyBody;

      beforeEach(() => {
        newOwnerData = UsersOwners.getDefaultNewOwner();
        newFirstItemData = getNewItem();
        newSecondItemData = getNewItem();
        DECLARE_LOST_ADDITIONAL_INFORMATION = getTestEntityValue('Some additional information');
        testData = {
          userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
        };
        lostItemFeePolicyBody = {
          name: getTestEntityValue('lost'),
          chargeAmountItem: {
            chargeType: 'actualCost',
            amount: 0.0,
          },
          lostItemProcessingFee: 0.0,
          chargeAmountItemPatron: true,
          chargeAmountItemSystem: true,
          lostItemChargeFeeFine: {
            duration: 2,
            intervalId: 'Days',
          },
          returnedLostItemProcessingFee: true,
          replacedLostItemProcessingFee: true,
          replacementProcessingFee: 0.0,
          replacementAllowed: true,
          lostItemReturned: 'Charge',
          id: uuid(),
        };

        cy.getAdminToken()
          .then(() => {
            ServicePoints.createViaApi(testData.userServicePoint);
            testData.defaultLocation = Location.getDefaultLocation(testData.userServicePoint.id);
            Location.createViaApi(testData.defaultLocation);
            cy.createLoanType({
              name: getTestEntityValue('type'),
            }).then((loanType) => {
              testData.loanTypeId = loanType.id;
            });
            cy.getMaterialTypes({ limit: 1 });
            cy.getInstanceTypes({ limit: 1 });
            cy.getLocations({ limit: 1 });
            cy.getHoldingTypes({ limit: 1 });
          })
          .then(() => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: Cypress.env('instanceTypes')[0].id,
                title: getTestEntityValue(),
              },
              holdings: [
                {
                  holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
                  permanentLocationId: testData.defaultLocation.id,
                },
              ],
              items: [
                {
                  ...newFirstItemData,
                  permanentLoanType: { id: testData.loanTypeId },
                  materialType: { id: Cypress.env('materialTypes')[0].id },
                },
                {
                  ...newSecondItemData,
                  permanentLoanType: { id: testData.loanTypeId },
                  materialType: { id: Cypress.env('materialTypes')[0].id },
                },
              ],
            }).then((specialInstanceIds) => {
              itemsData.instanceId = specialInstanceIds.instanceId;
              itemsData.holdingId = specialInstanceIds.holdingIds[0].id;
              itemsData.itemsId = specialInstanceIds.holdingIds[0].itemIds;
            });
          })
          .then(() => {
            LostItemFeePolicy.createViaApi(lostItemFeePolicyBody);
            CirculationRules.addRuleViaApi(
              { t: testData.loanTypeId },
              { i: lostItemFeePolicyBody.id },
            ).then((newRule) => {
              testData.addedRule = newRule;
            });
          });

        UsersOwners.createViaApi({
          ...newOwnerData,
          servicePointOwner: [
            {
              value: testData.userServicePoint.id,
              label: testData.userServicePoint.name,
            },
          ],
        }).then((ownerResponse) => {
          testData.ownerId = ownerResponse.id;
        });
        cy.createTempUser([
          permissions.uiUsersViewLoans.gui,
          permissions.uiUsersDeclareItemLost.gui,
        ]).then(({ username, password, userId, barcode: userBarcode }) => {
          testData.userId = userId;
          testData.username = username;
          testData.password = password;
          UserEdit.addServicePointViaApi(
            testData.userServicePoint.id,
            userId,
            testData.userServicePoint.id,
          ).then(() => {
            const date = new Date();
            // We need this wait because "testLoanDetails" has time-based checks
            // so "check out" and "declare lost" are expected to be done in the same minutes.
            cy.wait((60 - date.getSeconds()) * 1000);
            cy.wait(10000);
            [newFirstItemData.barcode, newSecondItemData.barcode].forEach((itemBarcode) => {
              Checkout.checkoutItemViaApi({
                itemBarcode,
                userBarcode,
                servicePointId: testData.userServicePoint.id,
              });
            });
            cy.login(username, password, {
              path: AppPaths.getOpenLoansPath(userId),
              waiter: () => cy.wait(5000),
            });
          });
        });
      });

      afterEach('Deleting created entities', () => {
        cy.getAdminToken();
        [newFirstItemData, newSecondItemData].forEach((item) => {
          CheckInActions.checkinItemViaApi({
            itemBarcode: item.barcode,
            servicePointId: testData.userServicePoint.id,
            checkInDate: new Date().toISOString(),
          });
        });
        itemsData.itemsId.forEach((id) => {
          cy.deleteItemViaApi(id);
        });
        LostItemFeePolicy.deleteViaApi(lostItemFeePolicyBody.id);
        CirculationRules.deleteRuleViaApi(testData.addedRule);
        cy.deleteLoanType(testData.loanTypeId);
        Users.deleteViaApi(testData.userId);
        UsersOwners.deleteViaApi(testData.ownerId);
        ServicePoints.deleteViaApi(testData.userServicePoint.id);
        cy.deleteHoldingRecordViaApi(itemsData.holdingId);
        InventoryInstance.deleteInstanceViaApi(itemsData.instanceId);
        Location.deleteInstitutionCampusLibraryLocationViaApi(
          testData.defaultLocation.institutionId,
          testData.defaultLocation.campusId,
          testData.defaultLocation.libraryId,
          testData.defaultLocation.id,
        );
      });

      it(
        'C9191 Loans: Declare lost (vega)',
        { tags: ['smoke', 'vega', 'system', 'shiftLeft', 'C9191', 'eurekaPhase1'] },
        () => {
          UsersCard.getApi(testData.userId).then((user) => {
            Loans.checkStatusCheckedOut(SECOND_LOAN_ROW_INDEX);
            Loans.startDeclareLost(SECOND_LOAN_ROW_INDEX);
            Loans.cancelDeclareLost();
            Loans.checkStatusCheckedOut(SECOND_LOAN_ROW_INDEX);

            Loans.startDeclareLost(SECOND_LOAN_ROW_INDEX);
            Loans.finishDeclareLost(DECLARE_LOST_ADDITIONAL_INFORMATION);
            Loans.checkStatusDeclaredLost(SECOND_LOAN_ROW_INDEX);

            const testLoanDetails = (shouldDeclareLost, loanId, loanHistoryFirstAction) => {
              cy.login(testData.username, testData.password, {
                path: AppPaths.getLoanDetailsPath(testData.userId, loanId),
                waiter: () => cy.wait(5000),
              });

              if (shouldDeclareLost) {
                LoanDetails.checkDeclareLostButtonIsActive();
                LoanDetails.startDeclareLost();
                LoanDetails.finishDeclareLost(DECLARE_LOST_ADDITIONAL_INFORMATION);
              }

              LoanDetails.checkDeclareLostButtonIsDisabled();
              LoanDetails.checkStatusDeclaredLost();
              LoanDetails.checkLostDate(loanHistoryFirstAction.loan.metadata.updatedDate);
              LoanDetails.checkActionDate(
                FIRST_ACTION_ROW_INDEX,
                loanHistoryFirstAction.loan.metadata.updatedDate,
              );

              LoanDetails.checkActionDeclaredLost(FIRST_ACTION_ROW_INDEX);
              LoanDetails.checkLoansActionsHaveSameDueDate(
                FIRST_ACTION_ROW_INDEX,
                SECOND_ACTION_ROW_INDEX,
                loanHistoryFirstAction.loan.dueDate,
              );
              LoanDetails.checkStatusDeclaredLostInList(FIRST_ACTION_ROW_INDEX);
              LoanDetails.checkSource(FIRST_ACTION_ROW_INDEX, user);
              LoanDetails.checkComments(
                FIRST_ACTION_ROW_INDEX,
                DECLARE_LOST_ADDITIONAL_INFORMATION,
              );
            };

            Loans.getApi(testData.userId).then(([firstLoan, secondLoan]) => {
              cy.getLoanHistory(secondLoan.id).then(([loanHistoryFirstAction]) => {
                testLoanDetails(false, secondLoan.id, loanHistoryFirstAction);
              });

              cy.getLoanHistory(firstLoan.id).then(([loanHistoryFirstAction]) => {
                testLoanDetails(true, firstLoan.id, loanHistoryFirstAction);
              });
            });
          });
        },
      );
    },
  );
});
