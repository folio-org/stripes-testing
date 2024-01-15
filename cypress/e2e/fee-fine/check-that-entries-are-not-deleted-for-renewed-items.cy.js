import uuid from 'uuid';

import { Permissions } from '../../support/dictionary';
import Checkout from '../../support/fragments/checkout/checkout';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import LostItemFeePolicy from '../../support/fragments/circulation/lost-item-fee-policy';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import { Locations, ServicePoints } from '../../support/fragments/settings/tenant';
import PaymentMethods from '../../support/fragments/settings/users/paymentMethods';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import TopMenu from '../../support/fragments/topMenu';
import OverrideAndRenewModal from '../../support/fragments/users/loans/overrideAndRenewModal';
import RenewConfirmationModal from '../../support/fragments/users/loans/renewConfirmationModal';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import LostItemsRequiringActualCostPage from '../../support/fragments/users/lostItemsRequiringActualCostPage';
import LoanDetails from '../../support/fragments/users/userDefaultObjects/loanDetails';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersSearchResultsPane from '../../support/fragments/users/usersSearchResultsPane';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Lost items requiring actual cost', () => {
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    userServicePoint: ServicePoints.getDefaultServicePoint(),
  };
  let itemData;
  const paymentMethod = {};
  const ownerData = UsersOwners.getDefaultNewOwner();
  const declareLostComments = getTestEntityValue('Some additional information');
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
      duration: 1,
      intervalId: 'Minutes',
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

  before('Create test data', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.createViaApi(testData.userServicePoint);
        testData.defaultLocation = Locations.getDefaultLocation({
          servicePointId: testData.userServicePoint.id,
        }).location;
        Locations.createViaApi(testData.defaultLocation).then((location) => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances,
            location,
          });
        });

        cy.createLoanType({
          name: getTestEntityValue('feeFine'),
        }).then((loanType) => {
          testData.loanTypeId = loanType.id;
        });
        UsersOwners.createViaApi({
          ...ownerData,
          servicePointOwner: [
            {
              value: testData.userServicePoint.id,
              label: testData.userServicePoint.name,
            },
          ],
        }).then((ownerResponse) => {
          testData.ownerId = ownerResponse.id;
          PaymentMethods.createViaApi(testData.ownerId).then(({ name, id }) => {
            paymentMethod.name = name;
            paymentMethod.id = id;
          });
        });
        itemData = testData.folioInstances[0];
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

    cy.createTempUser([
      Permissions.uiUserLostItemRequiringActualCost.gui,
      Permissions.loansRenew.gui,
      Permissions.loansRenewOverride.gui,
      Permissions.loansAll.gui,
      Permissions.uiUsersDeclareItemLost.gui,
    ]).then((user) => {
      testData.user = user;
      UserEdit.addServicePointViaApi(
        testData.userServicePoint.id,
        testData.user.userId,
        testData.userServicePoint.id,
      ).then(() => {
        Checkout.checkoutItemViaApi({
          itemBarcode: itemData.barcodes[0],
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
      UserLoans.openLoanDetails(itemData.barcodes[0]);

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
      UsersOwners.deleteViaApi(testData.ownerId);
      Locations.deleteViaApi(testData.defaultLocation);
    });
  });

  it(
    'C375276 Check that entries are NOT deleted for renewed items (Declared lost items) when item is renewed after "No fees/fines shall be refunded if a lost item is returned more than" parameter (vega) (TaaS)',
    { tags: ['extendedPath', 'vega'] },
    () => {
      cy.visit(TopMenu.usersPath);
      // Click on "Actions" drop-down => Click "Lost items requiring actual cost" action
      UsersSearchPane.openLostItemsRequiringActualCostPane();
      // Select "Declared lost" in "Loss type" filter
      LostItemsRequiringActualCostPage.searchByLossType('Declared lost');
      // Click on "..." button in "Actions" column => click on "Loan details" action
      LostItemsRequiringActualCostPage.openLoanDetails(itemData.instanceTitle);
      // Click on "Renew" button
      UserLoans.renewItem(itemData.barcodes[0], true);
      // Click on "Override" button
      RenewConfirmationModal.confirmRenewOverrideItem();
      // Select an Item to be Renewed and fill in "Additional information" field with any value and click on "Override" button
      OverrideAndRenewModal.confirmOverrideItem();
      // "Override & renew" modal closed
      OverrideAndRenewModal.verifyModalIsClosed();
      // "Renewed through override" action appears on "Loan details" page
      LoanDetails.checkAction(0, 'Renewed through override');
      // Go back to "Lost items requiring actual cost" page
      cy.visit(TopMenu.lostItemsRequiringActualCost);
      // Select "Declared lost" in "Loss type" filter
      LostItemsRequiringActualCostPage.searchByLossType('Declared lost');
      // Just returned Item still displayed on "Lost items requiring actual cost" page
      LostItemsRequiringActualCostPage.checkResultsLossType(
        itemData.instanceTitle,
        'Declared lost',
      );
    },
  );
});
