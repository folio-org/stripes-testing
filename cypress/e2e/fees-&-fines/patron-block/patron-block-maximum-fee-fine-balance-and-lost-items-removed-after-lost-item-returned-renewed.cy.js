import moment from 'moment';
import uuid from 'uuid';
import { APPLICATION_NAMES, ITEM_STATUS_NAMES } from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../../support/fragments/checkout/checkout';
import CirculationRules from '../../../support/fragments/circulation/circulation-rules';
import LoanPolicy from '../../../support/fragments/circulation/loan-policy';
import LostItemFeePolicy from '../../../support/fragments/circulation/lost-item-fee-policy';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Renewals from '../../../support/fragments/loans/renewals';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Conditions from '../../../support/fragments/settings/users/conditions';
import Limits from '../../../support/fragments/settings/users/limits';
import PatronGroups from '../../../support/fragments/settings/users/patronGroups';
import PaymentMethods from '../../../support/fragments/settings/users/paymentMethods';
import UsersOwners from '../../../support/fragments/settings/users/usersOwners';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import OverrideAndRenewModal from '../../../support/fragments/users/loans/overrideAndRenewModal';
import RenewConfirmationModal from '../../../support/fragments/users/loans/renewConfirmationModal';
import UserLoans from '../../../support/fragments/users/loans/userLoans';
import NewFeeFine from '../../../support/fragments/users/newFeeFine';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import generateUniqueItemBarcodeWithShift from '../../../support/utils/generateUniqueItemBarcodeWithShift';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Fees&Fines', () => {
  describe('Automated Patron Blocks', () => {
    const renewComment = `AutotestText${getRandomPostfix()}`;
    const patronGroup = {
      name: 'groupToPatronBlock' + getRandomPostfix(),
    };
    const userData = {};
    const itemsData = {
      itemsWithSeparateInstance: [
        { instanceTitle: `AT_C350655_InstanceForDeclareLost ${getRandomPostfix()}` },
        { instanceTitle: `AT_C350655_InstanceForDeclareLost ${getRandomPostfix()}` },
        { instanceTitle: `AT_C350655_InstanceForDeclareLost ${getRandomPostfix()}` },
        { instanceTitle: `AT_C350655_InstanceForAgedToLost ${getRandomPostfix()}` },
        { instanceTitle: `AT_C350655_InstanceForAgedToLost ${getRandomPostfix()}` },
      ],
    };
    const testData = {
      userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    };
    const ownerBody = {
      owner: 'AutotestOwner' + getRandomPostfix(),
      servicePointOwner: [
        {
          value: testData.userServicePoint.id,
          label: testData.userServicePoint.name,
        },
      ],
    };
    const lostItemFeePolicyBody = {
      name: '1_lost' + getRandomPostfix(),
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
      lostItemChargeFeeFine: {
        duration: 6,
        intervalId: 'Weeks',
      },
      returnedLostItemProcessingFee: false,
      replacedLostItemProcessingFee: false,
      replacementProcessingFee: '0.00',
      replacementAllowed: false,
      feesFinesShallRefunded: {
        duration: 6,
        intervalId: 'Months',
      },
      lostItemReturned: 'Charge',
      id: uuid(),
    };
    const loanPolicyBody = {
      id: uuid(),
      name: `1_minute_${getRandomPostfix()}`,
      loanable: true,
      loansPolicy: {
        closedLibraryDueDateManagementId: 'CURRENT_DUE_DATE_TIME',
        period: {
          duration: 1,
          intervalId: 'Minutes',
        },
        profileId: 'Rolling',
      },
      renewable: true,
      renewalsPolicy: {
        unlimited: false,
        numberAllowed: 2,
        renewFromId: 'SYSTEM_DATE',
      },
    };

    const findPatron = () => {
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
      UsersSearchPane.waitLoading();
      UsersSearchPane.resetAllFilters();
      UsersSearchPane.searchByKeywords(userData.barcode);
    };
    const setConditionAndLimit = (message, type, limit) => {
      Conditions.waitLoading();
      Conditions.select(type);
      Conditions.setConditionState(message);
      cy.visit(SettingsMenu.limitsPath);
      cy.wait(3000);
      Limits.selectGroup(patronGroup.name);
      Limits.setLimit(type, limit);
    };

    before('Preconditions', () => {
      itemsData.itemsWithSeparateInstance.forEach((item, index) => {
        item.barcode = generateUniqueItemBarcodeWithShift(index);
      });

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
            name: `type_${getRandomPostfix()}`,
          }).then((loanType) => {
            testData.loanTypeId = loanType.id;
          });
          cy.getDefaultMaterialType().then((materialTypes) => {
            testData.materialTypeId = materialTypes.id;
          });
        })
        .then(() => {
          itemsData.itemsWithSeparateInstance.forEach((item, index) => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: item.instanceTitle,
              },
              holdings: [
                {
                  holdingsTypeId: testData.holdingTypeId,
                  permanentLocationId: testData.defaultLocation.id,
                },
              ],
              items: [
                {
                  barcode: item.barcode,
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: testData.loanTypeId },
                  materialType: { id: testData.materialTypeId },
                },
              ],
            }).then((specialInstanceIds) => {
              itemsData.itemsWithSeparateInstance[index].instanceId = specialInstanceIds.instanceId;
              itemsData.itemsWithSeparateInstance[index].holdingId =
                specialInstanceIds.holdingIds[0].id;
              itemsData.itemsWithSeparateInstance[index].itemId =
                specialInstanceIds.holdingIds[0].itemIds;
            });
          });
        })
        .then(() => {
          LostItemFeePolicy.createViaApi(lostItemFeePolicyBody);
          LoanPolicy.createViaApi(loanPolicyBody);
          CirculationRules.addRuleViaApi(
            { t: testData.loanTypeId },
            { l: loanPolicyBody.id, i: lostItemFeePolicyBody.id },
          ).then((newRule) => {
            testData.addedRule = newRule;
          });
        });

      UsersOwners.createViaApi(ownerBody).then(({ id }) => {
        testData.ownerId = id;
        PaymentMethods.createViaApi(testData.ownerId).then((paymentMethod) => {
          testData.paymentMethodId = paymentMethod.id;
        });
      });
      PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
        patronGroup.id = patronGroupResponse;
      });
      cy.createTempUser(
        [
          permissions.uiUsersSettingsOwners.gui,
          permissions.loansAll.gui,
          permissions.overridePatronBlock.gui,
          permissions.loansRenewOverride.gui,
          permissions.uiUsersfeefinesCRUD.gui,
          permissions.uiUsersCreatePatronConditions.gui,
          permissions.uiUsersCreatePatronLimits.gui,
          permissions.checkinAll.gui,
          permissions.checkoutAll.gui,
          permissions.uiUsersView.gui,
          permissions.okapiTimersPatch.gui,
          permissions.uiCirculationCreateViewOverdueFinesPolicies.gui,
        ],
        patronGroup.name,
      ).then((userProperties) => {
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
        userData.barcode = userProperties.barcode;
        UserEdit.addServicePointViaApi(
          testData.userServicePoint.id,
          userData.userId,
          testData.userServicePoint.id,
        );
        cy.getToken(userData.username, userData.password);
        cy.getAdminToken();
      });
    });

    beforeEach('Assign lost status to items', () => {
      cy.getAdminToken();
      cy.wrap(itemsData.itemsWithSeparateInstance).as('items');
      cy.get('@items').each((item) => {
        Checkout.checkoutItemViaApi({
          id: uuid(),
          itemBarcode: item.barcode,
          loanDate: moment.utc().format(),
          servicePointId: testData.userServicePoint.id,
          userBarcode: userData.barcode,
        });
      });

      UserLoans.getUserLoansIdViaApi(userData.userId).then((userLoans) => {
        const loansData = userLoans.loans;
        const newDueDate = new Date(loansData[0].loanDate);
        newDueDate.setDate(newDueDate.getDate() - 1);
        loansData.forEach((loan) => {
          if (loan.item.title.includes('InstanceForDeclareLost')) {
            UserLoans.declareLoanLostViaApi(
              {
                servicePointId: testData.userServicePoint.id,
                declaredLostDateTime: moment.utc().format(),
              },
              loan.id,
            );
          } else if (loan.item.title.includes('InstanceForAgedToLost')) {
            UserLoans.changeDueDateViaApi(
              {
                ...loan,
                dueDate: newDueDate,
                action: 'dueDateChanged',
              },
              loan.id,
            );
          }
        });
      });
      cy.wait(20000);
      cy.login(userData.username, userData.password, {
        path: SettingsMenu.conditionsPath,
        waiter: Conditions.waitLoading,
      });
    });

    afterEach('Returning items to original state', () => {
      cy.getAdminToken();
      cy.get('@items').each((item) => {
        CheckInActions.checkinItemViaApi({
          itemBarcode: item.barcode,
          servicePointId: testData.userServicePoint.id,
          checkInDate: new Date().toISOString(),
        });
      });
      NewFeeFine.getUserFeesFines(userData.userId).then((userFeesFines) => {
        const feesFinesData = userFeesFines.accounts;
        feesFinesData.forEach(({ id }) => {
          cy.deleteFeesFinesApi(id);
        });
      });
    });

    after('Deleting created entities', () => {
      cy.getToken(userData.username, userData.password);
      cy.getAdminToken();
      CirculationRules.deleteRuleViaApi(testData.addedRule);
      cy.get('@items').each((item, index) => {
        cy.deleteItemViaApi(item.itemId);
        cy.deleteHoldingRecordViaApi(itemsData.itemsWithSeparateInstance[index].holdingId);
        InventoryInstance.deleteInstanceViaApi(
          itemsData.itemsWithSeparateInstance[index].instanceId,
        );
      });
      PaymentMethods.deleteViaApi(testData.paymentMethodId);
      UsersOwners.deleteViaApi(testData.ownerId);
      cy.deleteLoanPolicy(loanPolicyBody.id);
      LostItemFeePolicy.deleteViaApi(lostItemFeePolicyBody.id);
      cy.deleteLoanType(testData.loanTypeId);
      UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
      ServicePoints.deleteViaApi(testData.userServicePoint.id);
      Users.deleteViaApi(userData.userId);
      PatronGroups.deleteViaApi(patronGroup.id);
      Conditions.resetConditionViaApi('Maximum outstanding fee/fine balance');
      Conditions.resetConditionViaApi('Maximum number of lost items');

      Location.deleteInstitutionCampusLibraryLocationViaApi(
        testData.defaultLocation.institutionId,
        testData.defaultLocation.campusId,
        testData.defaultLocation.libraryId,
        testData.defaultLocation.id,
      );
    });

    it(
      'C350655 Verify automated patron block "Maximum outstanding fee/fine balance" removed after lost item renewed (vega)',
      { tags: ['criticalPathBroken', 'vega', 'C350655'] },
      () => {
        const blockMessage = `You have reached maximum outstanding fee/fine balance as set by patron group${getRandomPostfix()}`;
        setConditionAndLimit(blockMessage, 'Maximum outstanding fee/fine balance', '624');
        Users.waitForAutomatedPatronBlocksForUser(userData.userId, 4 * 60);
        findPatron();
        UsersCard.waitLoading();
        cy.wait(2000);
        Users.checkIsPatronBlocked(blockMessage, 'Borrowing, Renewals, Requests');
        const itemForRenew = itemsData.itemsWithSeparateInstance[Math.floor(Math.random() * 5)];
        UsersCard.viewCurrentLoans();
        UserLoans.openLoanDetails(itemForRenew.barcode);
        UserLoans.renewItem(itemForRenew.barcode, true);
        Renewals.renewBlockedPatron(renewComment);
        RenewConfirmationModal.waitLoading();
        RenewConfirmationModal.confirmRenewOverrideItem();
        OverrideAndRenewModal.confirmOverrideItem();

        findPatron();
        cy.wait(2000);
        Users.checkPatronIsNotBlocked(userData.userId);
        Users.checkPatronIsNotBlockedViaApi(userData.userId);
      },
    );

    it(
      'C350651 Verify automated patron block "Maximum outstanding fee/fine balance" removed after lost item returned (vega)',
      { tags: ['criticalPathBroken', 'vega', 'C350651'] },
      () => {
        const blockMessage = `You have reached maximum outstanding fee/fine balance as set by patron group${getRandomPostfix()}`;
        setConditionAndLimit(blockMessage, 'Maximum outstanding fee/fine balance', '624');
        Users.waitForAutomatedPatronBlocksForUser(userData.userId, 4 * 60);
        findPatron();
        UsersCard.waitLoading();
        cy.wait(2000);
        Users.checkIsPatronBlocked(blockMessage, 'Borrowing, Renewals, Requests');

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_IN);
        CheckInActions.waitLoading();
        const itemForCheckIn = itemsData.itemsWithSeparateInstance[Math.floor(Math.random() * 5)];
        CheckInActions.checkInItemGui(itemForCheckIn.barcode);
        CheckInActions.confirmCheckInLostItem();
        CheckInActions.verifyLastCheckInItem(itemForCheckIn.barcode);

        findPatron();
        cy.wait(2000);
        Users.checkPatronIsNotBlocked(userData.userId);
        Users.checkPatronIsNotBlockedViaApi(userData.userId);
      },
    );

    it(
      'C350653 Verify automated patron block "Maximum number of lost items" removed after lost item renewed (vega)',
      { tags: ['criticalPathBroken', 'vega', 'C350653'] },
      () => {
        const blockMessage = `You have reached maximum number of lost items as set by patron group${getRandomPostfix()}`;
        setConditionAndLimit(blockMessage, 'Maximum number of lost items', '4');
        Users.waitForAutomatedPatronBlocksForUser(userData.userId, 4 * 60);
        findPatron();
        UsersCard.waitLoading();
        cy.wait(2000);
        Users.checkIsPatronBlocked(blockMessage, 'Borrowing, Renewals, Requests');

        const itemForRenew = itemsData.itemsWithSeparateInstance[Math.floor(Math.random() * 5)];
        UsersCard.viewCurrentLoans();
        UserLoans.openLoanDetails(itemForRenew.barcode);
        UserLoans.renewItem(itemForRenew.barcode, true);
        Renewals.renewBlockedPatron(renewComment);
        RenewConfirmationModal.waitLoading();
        RenewConfirmationModal.confirmRenewOverrideItem();
        OverrideAndRenewModal.confirmOverrideItem();

        findPatron();
        cy.wait(2000);
        Users.checkPatronIsNotBlocked(userData.userId);
        Users.checkPatronIsNotBlockedViaApi(userData.userId);
      },
    );

    it(
      'C350648 Verify automated patron block "Maximum number of lost items" removed after lost item returned (vega)',
      { tags: ['criticalPathBroken', 'vega', 'C350648'] },
      () => {
        const blockMessage = `You have reached maximum number of lost items as set by patron group${getRandomPostfix()}`;
        setConditionAndLimit(blockMessage, 'Maximum number of lost items', '4');
        Users.waitForAutomatedPatronBlocksForUser(userData.userId, 4 * 60);
        findPatron();
        UsersCard.waitLoading();
        cy.wait(2000);
        Users.checkIsPatronBlocked(blockMessage, 'Borrowing, Renewals, Requests');

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_IN);
        CheckInActions.waitLoading();
        const itemForCheckIn = itemsData.itemsWithSeparateInstance[Math.floor(Math.random() * 5)];
        CheckInActions.checkInItemGui(itemForCheckIn.barcode);
        CheckInActions.confirmCheckInLostItem();
        CheckInActions.verifyLastCheckInItem(itemForCheckIn.barcode);

        findPatron();
        cy.wait(2000);
        Users.checkPatronIsNotBlocked(userData.userId);
        Users.checkPatronIsNotBlockedViaApi(userData.userId);
      },
    );
  });
});
