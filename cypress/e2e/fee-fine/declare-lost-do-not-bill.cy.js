import uuid from 'uuid';

import { getTestEntityValue } from '../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../support/dictionary';
import { Locations, ServicePoints } from '../../support/fragments/settings/tenant';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import PaymentMethods from '../../support/fragments/settings/users/paymentMethods';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import Checkout from '../../support/fragments/checkout/checkout';
import TopMenu from '../../support/fragments/topMenu';
import UsersSearchResultsPane from '../../support/fragments/users/usersSearchResultsPane';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import UsersCard from '../../support/fragments/users/usersCard';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import LoanDetails from '../../support/fragments/users/userDefaultObjects/loanDetails';
import LostItemFeePolicy from '../../support/fragments/circulation/lost-item-fee-policy';
import LostItemsRequiringActualCostPage from '../../support/fragments/users/lostItemsRequiringActualCostPage';
import DoNotBillModal from '../../support/fragments/users/doNotBillModal';

describe('Lost items requiring actual cost', () => {
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    userServicePoint: ServicePoints.getDefaultServicePoint(),
  };
  let instanceTitle;
  const declareLostComments = getTestEntityValue('Some additional information');
  const paymentMethod = {};
  const ownerData = UsersOwners.getDefaultNewOwner();

  const lostItemFeePolicy = {
    name: getTestEntityValue('1-minute-test'),
    chargeAmountItem: {
      chargeType: 'actualCost',
      amount: 0.0,
    },
    lostItemProcessingFee: 25.0,
    chargeAmountItemPatron: true,
    chargeAmountItemSystem: true,
    itemAgedLostOverdue: {
      duration: 1,
      intervalId: 'Minutes',
    },
    lostItemChargeFeeFine: {
      duration: 6,
      intervalId: 'Weeks',
    },
    feesFinesShallRefunded: {
      duration: 6,
      intervalId: 'Months',
    },
    patronBilledAfterAgedLost: {
      duration: 1,
      intervalId: 'Minutes',
    },
    returnedLostItemProcessingFee: false,
    replacedLostItemProcessingFee: false,
    replacementProcessingFee: 0.0,
    replacementAllowed: false,
    lostItemReturned: 'Charge',
    id: uuid(),
  };

  before('Create test entities', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.createViaApi(testData.userServicePoint);
      testData.defaultLocation = Locations.getDefaultLocation({
        servicePointId: testData.userServicePoint.id,
      }).location;
      Locations.createViaApi(testData.defaultLocation)
        .then((location) => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances,
            location,
          });
        })
        .then(() => {
          cy.createLoanType({
            name: getTestEntityValue('feeFine'),
          }).then((loanType) => {
            testData.loanTypeId = loanType.id;
          });
        })
        .then(() => {
          UsersOwners.createViaApi({
            ...ownerData,
            servicePointOwner: [
              {
                value: testData.userServicePoint.id,
                label: testData.userServicePoint.name,
              },
            ],
          }).then((ownerResponse) => {
            testData.owner = ownerResponse;
            PaymentMethods.createViaApi(testData.owner.id).then(({ name, id }) => {
              paymentMethod.name = name;
              paymentMethod.id = id;
            });
          });
        })
        .then(() => {
          LostItemFeePolicy.createViaApi(lostItemFeePolicy);
          CirculationRules.addRuleViaApi(
            { t: testData.loanTypeId },
            { i: lostItemFeePolicy.id },
          ).then((newRule) => {
            testData.addedRule = newRule;
          });
        });
    });
    instanceTitle = testData.folioInstances[0].instanceTitle;
    cy.createTempUser([
      Permissions.uiUserLostItemRequiringActualCost.gui,
      Permissions.loansRenew.gui,
      Permissions.loansRenewOverride.gui,
      Permissions.loansAll.gui,
      Permissions.checkinAll.gui,
      Permissions.uiUsersDeclareItemLost.gui,
    ]).then((user) => {
      testData.user = user;
      UserEdit.addServicePointViaApi(
        testData.userServicePoint.id,
        testData.user.userId,
        testData.userServicePoint.id,
      ).then(() => {
        Checkout.checkoutItemViaApi({
          itemBarcode: testData.folioInstances[0].barcodes[0],
          userBarcode: testData.user.barcode,
          servicePointId: testData.userServicePoint.id,
        });
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchResultsPane.waitLoading,
        });
      });

      UsersSearchPane.searchByKeywords(testData.user.userId);
      UsersSearchPane.openUser(testData.user.userId);
      UsersCard.waitLoading();
      UsersCard.viewCurrentLoans();
      UserLoans.openLoanDetails(testData.folioInstances[0].barcodes[0]);

      LoanDetails.checkAction(0, 'Checked out');
      LoanDetails.startDeclareLost();
      LoanDetails.finishDeclareLost(declareLostComments);
      LoanDetails.checkAction(0, 'Declared lost');
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      CirculationRules.deleteRuleViaApi(testData.addedRule);
      InventoryInstances.deleteInstanceViaApi({
        instance: testData.folioInstances[0],
        servicePoint: testData.userServicePoint,
        shouldCheckIn: true,
      });
      LostItemFeePolicy.deleteViaApi(lostItemFeePolicy.id);
      cy.deleteLoanType(testData.loanTypeId);
      Users.deleteViaApi(testData.user.userId);
      UsersOwners.deleteViaApi(testData.owner.id);
      Locations.deleteViaApi(testData.defaultLocation);
    });
  });

  it(
    'C375156 Verify ability do not bill patron for actual cost for item with "Declared to Lost" status (vega) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.vega] },
    () => {
      cy.visit(TopMenu.usersPath);
      // Click on "Actions" drop-down => Click "Lost items requiring actual cost" action
      UsersSearchPane.openLostItemsRequiringActualCostPane();
      // Select "Declared lost" in "Loss type" filter
      LostItemsRequiringActualCostPage.searchByLossType('Declared lost');
      // Click on “Do not bill” action from ellipse in "Actions" column on any record
      LostItemsRequiringActualCostPage.openDoNotBill(instanceTitle);
      DoNotBillModal.waitLoading();
      DoNotBillModal.checkModalInfo(testData.user, testData.owner);
      // Click on "Cancel" button
      DoNotBillModal.cancel();
      // Click on “Do not bill” action from ellipse in "Actions" column on any record
      LostItemsRequiringActualCostPage.openDoNotBill(instanceTitle);
      DoNotBillModal.waitLoading();
      // Click on "x" button
      DoNotBillModal.closeModal();
      // Click on “Do not bill” action from ellipse in "Actions" column on any record
      LostItemsRequiringActualCostPage.openDoNotBill(instanceTitle);
      DoNotBillModal.waitLoading();
      // Click on "Continue" button
      DoNotBillModal.continue();
      // "Confirm no bill to be created" modal opened
      DoNotBillModal.checkConfirmModalInfo(testData.user);
      // Click on "Keep editing: button
      DoNotBillModal.keepEditing();
      DoNotBillModal.checkModalInfo(testData.user, testData.owner);
      // Click on "Continue" button
      DoNotBillModal.continue();
      // Click on "Confirm" button
      DoNotBillModal.confirm();
      // Success toast "A lost item fee will not be charged to <insert patron-last-name, patron-first-name patron-middle-name>" displayed
      DoNotBillModal.verifyCalloutMessage(testData.user);
      // Click on "..." button
      LostItemsRequiringActualCostPage.checkDropdownOptionsDisabled(instanceTitle, [
        'Bill actual cost',
        'Do not bill',
      ]);
    },
  );
});
