import moment from 'moment';
import uuid from 'uuid';
import { ITEM_STATUS_NAMES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import AppPaths from '../../support/fragments/app-paths';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckInClaimedReturnedItem from '../../support/fragments/checkin/modals/checkInClaimedReturnedItem';
import Checkout from '../../support/fragments/checkout/checkout';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import LoanPolicy from '../../support/fragments/circulation/loan-policy';
import LostItemFeePolicy from '../../support/fragments/circulation/lost-item-fee-policy';
import OverdueFinePolicy from '../../support/fragments/circulation/overdue-fine-policy';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import LoansPage from '../../support/fragments/loans/loansPage';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import WaiveReasons from '../../support/fragments/settings/users/waiveReasons';
import TopMenu from '../../support/fragments/topMenu';
import FeeFineDetails from '../../support/fragments/users/feeFineDetails';
import ConfirmClaimReturnedModal from '../../support/fragments/users/loans/confirmClaimReturnedModal';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import LoanDetails from '../../support/fragments/users/userDefaultObjects/loanDetails';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import WaiveFeeFinesModal from '../../support/fragments/users/waiveFeeFineModal';
import generateUniqueItemBarcodeWithShift from '../../support/utils/generateUniqueItemBarcodeWithShift';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Fees&Fines', () => {
  describe('Claimed Returned', () => {
    const patronGroup = {
      name: getTestEntityValue('groupClaimedReturned'),
    };
    const instanceData = {
      item1Barcode: generateUniqueItemBarcodeWithShift(),
      item2Barcode: generateUniqueItemBarcodeWithShift(),
      title: getTestEntityValue('InstanceCR'),
    };
    let userData;
    const testData = {
      userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
      ruleProps: {},
    };

    const loanPolicyBody = {
      id: uuid(),
      name: getTestEntityValue('1_minute'),
      loanable: true,
      loansPolicy: {
        closedLibraryDueDateManagementId: 'CURRENT_DUE_DATE_TIME',
        period: {
          duration: 1,
          intervalId: 'Minutes',
        },
        profileId: 'Rolling',
      },
      renewable: false,
    };
    const overdueFinePolicyBody = {
      id: uuid(),
      name: getTestEntityValue('1_overdue'),
      overdueFine: { quantity: '1.00', intervalId: 'minute' },
      countClosed: true,
      maxOverdueFine: '100.00',
    };
    const lostItemFeePolicyBody = {
      name: getTestEntityValue('1_lost'),
      itemAgedLostOverdue: {
        duration: 1,
        intervalId: 'Minutes',
      },
      patronBilledAfterAgedLost: {
        duration: 1,
        intervalId: 'Minutes',
      },
      chargeAmountItem: {
        chargeType: 'anotherCost',
        amount: '100.00',
      },
      lostItemProcessingFee: '25.00',
      chargeAmountItemPatron: true,
      chargeAmountItemSystem: true,
      lostItemChargeFeeFine: { duration: 2, intervalId: 'Days' },
      returnedLostItemProcessingFee: false,
      replacedLostItemProcessingFee: false,
      replacementProcessingFee: '0.00',
      replacementAllowed: false,
      lostItemReturned: 'Charge',
      id: uuid(),
    };
    const ruleProps = {
      l: loanPolicyBody.id,
      o: overdueFinePolicyBody.id,
      i: lostItemFeePolicyBody.id,
    };
    const ownerBody = {
      id: uuid(),
      owner: getTestEntityValue('AutotestOwner'),
      servicePointOwner: [
        {
          value: testData.userServicePoint.id,
          label: testData.userServicePoint.name,
        },
      ],
    };
    const waiveReason = WaiveReasons.getDefaultNewWaiveReason(uuid());

    before('Preconditions', () => {
      cy.getAdminToken()
        .then(() => {
          ServicePoints.createViaApi(testData.userServicePoint);
          testData.defaultLocation = Location.getDefaultLocation(testData.userServicePoint.id);
          Location.createViaApi(testData.defaultLocation);
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
            testData.holdingTypeId = holdingTypes[0].id;
          });
          cy.createLoanType({
            name: getTestEntityValue('type'),
          }).then((loanType) => {
            testData.loanTypeId = loanType.id;
          });
          cy.getMaterialTypes({ limit: 1 }).then((materialTypes) => {
            testData.materialTypeId = materialTypes.id;
            instanceData.materialType = materialTypes.name;
          });
        })
        .then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: instanceData.title,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.defaultLocation.id,
              },
            ],
            items: [
              {
                barcode: instanceData.item1Barcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
              {
                barcode: instanceData.item2Barcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          });
        })
        .then(() => {
          UsersOwners.createViaApi(ownerBody);
          WaiveReasons.createViaApi(waiveReason);
          LoanPolicy.createViaApi(loanPolicyBody);
          OverdueFinePolicy.createViaApi(overdueFinePolicyBody);
          LostItemFeePolicy.createViaApi(lostItemFeePolicyBody);
          CirculationRules.addRuleViaApi({ t: testData.loanTypeId }, ruleProps).then((newRule) => {
            testData.addedRule = newRule;
          });
        })
        .then(() => {
          PatronGroups.createViaApi(patronGroup.name).then((res) => {
            patronGroup.id = res;
            cy.createTempUser(
              [
                Permissions.uiUsersView.gui,
                Permissions.uiUsersViewLoans.gui,
                Permissions.uiFeeFines.gui,
                Permissions.uiFeeFinesCanWaive.gui,
                Permissions.okapiTimersPatch.gui,
                Permissions.checkinAll.gui,
              ],
              patronGroup.name,
            ).then((userProperties) => {
              userData = userProperties;
              UserEdit.addServicePointViaApi(
                testData.userServicePoint.id,
                userData.userId,
                testData.userServicePoint.id,
              );
            });
          });
        })
        .then(() => {
          cy.getToken(userData.username, userData.password);
          UserLoans.updateTimerForAgedToLost('minute');
          cy.getAdminToken();
        })
        .then(() => {
          cy.wrap([instanceData.item1Barcode, instanceData.item2Barcode]).each((item) => {
            Checkout.checkoutItemViaApi({
              id: uuid(),
              itemBarcode: item,
              loanDate: moment.utc().format(),
              servicePointId: testData.userServicePoint.id,
              userBarcode: userData.barcode,
            });
          });
          cy.loginAsAdmin();
          UserLoans.getUserLoansIdViaApi(userData.userId).then((userLoans) => {
            const loansData = userLoans.loans;
            const newDueDate = new Date(loansData[0].loanDate);
            newDueDate.setDate(newDueDate.getDate() - 1);
            loansData.forEach((loan) => {
              cy.visit(`users/${userData.userId}/loans/view/${loan.id}`);
              if (loan.item.barcode.includes(instanceData.item1Barcode)) {
                UserLoans.openClaimReturnedPane();
                ConfirmClaimReturnedModal.confirmClaimReturnedInLoanDetails();
                LoanDetails.checkStatusInList(0, ITEM_STATUS_NAMES.CLAIMED_RETURNED);
              } else if (loan.item.barcode.includes(instanceData.item2Barcode)) {
                UserLoans.changeDueDateViaApi(
                  {
                    ...loan,
                    dueDate: newDueDate,
                    action: 'dueDateChanged',
                  },
                  loan.id,
                );
                // needed for the "Lost Item Fee Policy" so patron can receive fee/fine
                cy.wait(250000);
                cy.reload();
                LoanDetails.checkStatusInList(0, ITEM_STATUS_NAMES.AGED_TO_LOST);
                UserLoans.openClaimReturnedPane();
                ConfirmClaimReturnedModal.confirmClaimReturnedInLoanDetails();
                LoanDetails.checkStatusInList(0, ITEM_STATUS_NAMES.CLAIMED_RETURNED);
              }
            });
          });
        })
        .then(() => {
          cy.login(userData.username, userData.password, {
            path: TopMenu.checkInPath,
            waiter: CheckInActions.waitLoading,
          });
        });
    });

    after('Deleting created entities', () => {
      cy.getToken(userData.username, userData.password);
      UserLoans.updateTimerForAgedToLost('reset');
      cy.getAdminToken();
      CirculationRules.deleteRuleViaApi(testData.addedRule);
      UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
      ServicePoints.deleteViaApi(testData.userServicePoint.id);
      cy.deleteLoanPolicy(loanPolicyBody.id);
      OverdueFinePolicy.deleteViaApi(overdueFinePolicyBody.id);
      LostItemFeePolicy.deleteViaApi(lostItemFeePolicyBody.id);
      Users.deleteViaApi(userData.userId);
      PatronGroups.deleteViaApi(patronGroup.id);
      WaiveReasons.deleteViaApi(waiveReason.id);
      UsersOwners.deleteViaApi(ownerBody.id);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(instanceData.item1Barcode);
      Location.deleteInstitutionCampusLibraryLocationViaApi(
        testData.defaultLocation.institutionId,
        testData.defaultLocation.campusId,
        testData.defaultLocation.libraryId,
        testData.defaultLocation.id,
      );
      cy.deleteLoanType(testData.loanTypeId);
    });

    it(
      'C11041 Verify claimed returned fee/fine behavior when item checked in as "found by library" (vega)',
      { tags: ['criticalPathBroken', 'vega', 'C11041'] },
      () => {
        CheckInActions.checkInItemGui(instanceData.item1Barcode);
        CheckInClaimedReturnedItem.checkModalMessage({
          ...instanceData,
          barcode: instanceData.item1Barcode,
        });
        CheckInClaimedReturnedItem.chooseItemReturnedByLibrary();
        CheckInActions.openLoanDetails(userData.username);
        LoansPage.verifyResultsInTheRow([ITEM_STATUS_NAMES.FOUND_BY_LIBRARY]);
        cy.visit(TopMenu.checkInPath);
        CheckInActions.waitLoading();
        CheckInActions.checkInItemGui(instanceData.item2Barcode);
        CheckInClaimedReturnedItem.checkModalMessage({
          ...instanceData,
          barcode: instanceData.item2Barcode,
        });
        CheckInClaimedReturnedItem.chooseItemReturnedByLibrary();
        cy.wait(10000);
        NewFeeFine.getUserFeesFines(userData.userId).then((userFeesFines) => {
          const feesFineId = userFeesFines.accounts[0].id;
          cy.visit(AppPaths.getFeeFineDetailsPath(userData.userId, feesFineId));
          FeeFineDetails.checkFeeFineBilledAmount('$25.00');
          FeeFineDetails.openActions();
          FeeFineDetails.openWaiveModal();
          WaiveFeeFinesModal.setWaiveAmount('25.00');
          WaiveFeeFinesModal.selectWaiveReason(waiveReason.nameReason);
          WaiveFeeFinesModal.confirm();
        });
      },
    );
  });
});
