import uuid from 'uuid';
import { getTestEntityValue } from '../../../support/utils/stringTools';
import TestType from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import AppPaths from '../../../support/fragments/app-paths';
import { getNewItem } from '../../../support/fragments/inventory/item';
import UsersOwners from '../../../support/fragments/settings/users/usersOwners';
import Loans from '../../../support/fragments/users/userDefaultObjects/loans';
import LoanDetails from '../../../support/fragments/users/userDefaultObjects/loanDetails';
import Checkout from '../../../support/fragments/checkout/checkout';
import UsersCard from '../../../support/fragments/users/usersCard';
import permissions from '../../../support/dictionary/permissions';
import UserEdit from '../../../support/fragments/users/userEdit';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import LostItemFeePolicy from '../../../support/fragments/circulation/lost-item-fee-policy';
import CirculationRules from '../../../support/fragments/circulation/circulation-rules';
import Users from '../../../support/fragments/users/users';
import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';

describe('ui-users-loans: Loans', () => {
  let addedCirculationRule;
  const newOwnerData = UsersOwners.getDefaultNewOwner();
  const newFirstItemData = getNewItem();
  const newSecondItemData = getNewItem();
  const DECLARE_LOST_ADDITIONAL_INFORMATION = getTestEntityValue('Some additional information');
  const SECOND_LOAN_ROW_INDEX = 1;
  const FIRST_ACTION_ROW_INDEX = 0;
  const SECOND_ACTION_ROW_INDEX = 1;
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  const itemsData = {};
  let originalCirculationRules;
  const lostItemFeePolicyBody = {
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

  beforeEach(() => {
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
    LostItemFeePolicy.createViaApi(lostItemFeePolicyBody);
    CirculationRules.getViaApi().then((circulationRule) => {
      originalCirculationRules = circulationRule.rulesAsText;
      const ruleProps = CirculationRules.getRuleProps(circulationRule.rulesAsText);
      ruleProps.i = lostItemFeePolicyBody.id;
      addedCirculationRule =
        't ' +
        testData.loanTypeId +
        ': i ' +
        ruleProps.i +
        ' l ' +
        ruleProps.l +
        ' r ' +
        ruleProps.r +
        ' o ' +
        ruleProps.o +
        ' n ' +
        ruleProps.n;
      CirculationRules.addRuleViaApi(
        originalCirculationRules,
        ruleProps,
        't ',
        testData.loanTypeId,
      );
    });

    cy.createTempUser([
      permissions.uiUsersViewLoans.gui,
      permissions.uiUsersDeclareItemLost.gui,
    ]).then(({ username, password, userId, barcode: userBarcode }) => {
      testData.userId = userId;
      UserEdit.addServicePointViaApi(
        testData.userServicePoint.id,
        userId,
        testData.userServicePoint.id,
      ).then(() => {
        const date = new Date();
        // We need this wait because "testLoanDetails" has time-based checks
        // so "сheck out" and "declare lost" are expected to be done in the same minutes.
        cy.wait((60 - date.getSeconds()) * 1000);
        [newFirstItemData.barcode, newSecondItemData.barcode].forEach((itemBarcode) => {
          Checkout.checkoutItemViaApi({
            itemBarcode,
            userBarcode,
            servicePointId: testData.userServicePoint.id,
          });
        });
        cy.login(username, password);
        cy.visit(AppPaths.getOpenLoansPath(userId));
      });
    });
  });

  after('Deleting created entities', () => {
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
    CirculationRules.deleteRuleViaApi(addedCirculationRule);
    cy.deleteLoanType(testData.loanTypeId);
    Users.deleteViaApi(testData.userId);
    UsersOwners.deleteViaApi(testData.ownerId);
    cy.deleteHoldingRecordViaApi(itemsData.holdingId);
    InventoryInstance.deleteInstanceViaApi(itemsData.instanceId);
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
  });

  it(
    'C9191 Loans: Declare lost (prokopovych)',
    { tags: [TestType.smoke, TestType.broken, DevTeams.prokopovych] },
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
          cy.visit(AppPaths.getLoanDetailsPath(testData.userId, loanId));

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
          LoanDetails.checkComments(FIRST_ACTION_ROW_INDEX, DECLARE_LOST_ADDITIONAL_INFORMATION);
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
});
