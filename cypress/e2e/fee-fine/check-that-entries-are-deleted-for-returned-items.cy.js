import uuid from 'uuid';

import { Permissions } from '../../support/dictionary';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../support/fragments/checkout/checkout';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import LostItemFeePolicy from '../../support/fragments/circulation/lost-item-fee-policy';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import { Locations, ServicePoints } from '../../support/fragments/settings/tenant';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import TopMenu from '../../support/fragments/topMenu';
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
    servicePoint: ServicePoints.getDefaultServicePoint(),
  };
  let itemData;
  const ownerData = UsersOwners.getDefaultNewOwner();
  const declareLostComments = getTestEntityValue('Some additional information');
  const feePolicyBody = {
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

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.createViaApi(testData.servicePoint);
      testData.defaultLocation = Locations.getDefaultLocation({
        servicePointId: testData.servicePoint.id,
      }).location;
      Locations.createViaApi(testData.defaultLocation).then((location) => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location,
        });
      });

      cy.createLoanType({
        name: getTestEntityValue('feeFine'),
      })
        .then((loanType) => {
          testData.loanTypeId = loanType.id;
        })
        .then(() => {
          LostItemFeePolicy.createViaApi(feePolicyBody);
          CirculationRules.addRuleViaApi({ t: testData.loanTypeId }, { i: feePolicyBody.id }).then(
            (newRule) => {
              testData.addedRule = newRule;
            },
          );
        });
      UsersOwners.createViaApi({
        ...ownerData,
        servicePointOwner: [
          {
            value: testData.servicePoint.id,
            label: testData.servicePoint.name,
          },
        ],
      }).then((ownerResponse) => {
        testData.ownerId = ownerResponse.id;
      });
      itemData = testData.folioInstances[0];
    });

    cy.createTempUser([
      Permissions.uiUserLostItemRequiringActualCost.gui,
      Permissions.loansRenew.gui,
      Permissions.loansRenewOverride.gui,
      Permissions.loansAll.gui,
      Permissions.checkinAll.gui,
      Permissions.uiUsersDeclareItemLost.gui,
    ]).then((user) => {
      testData.userData = user;
      UserEdit.addServicePointViaApi(
        testData.servicePoint.id,
        testData.userData.userId,
        testData.servicePoint.id,
      ).then(() => {
        Checkout.checkoutItemViaApi({
          itemBarcode: itemData.barcodes[0],
          userBarcode: testData.userData.barcode,
          servicePointId: testData.servicePoint.id,
        });
        cy.login(testData.userData.username, testData.userData.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchResultsPane.waitLoading,
        });
      });

      UsersSearchPane.searchByKeywords(testData.userData.userId);
      UsersSearchPane.openUser(testData.userData.userId);
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
        servicePoint: testData.servicePoint,
        shouldCheckIn: true,
      });
      LostItemFeePolicy.deleteViaApi(feePolicyBody.id);
      cy.deleteLoanType(testData.loanTypeId);
      Users.deleteViaApi(testData.userData.userId);
      UsersOwners.deleteViaApi(testData.ownerId);
      Locations.deleteViaApi(testData.defaultLocation);
    });
  });

  it(
    'C375279 Check that entries are deleted for returned items (Declared lost items) (vega) (TaaS)',
    { tags: ['extendedPath', 'vega'] },
    () => {
      cy.visit(TopMenu.usersPath);
      // Click on "Actions" drop-down => Click "Lost items requiring actual cost" action
      UsersSearchPane.openLostItemsRequiringActualCostPane();
      // Select "Declared lost" in "Loss type" filter
      LostItemsRequiringActualCostPage.searchByLossType('Declared lost');
      // Records with <instance_title_name> displayed at the result list with "Declared lost" status
      LostItemsRequiringActualCostPage.checkResultsLossType(
        itemData.instanceTitle,
        'Declared lost',
      );
      // Go to "Check in" app and check in Item from preconditions
      cy.visit(TopMenu.checkInPath);
      CheckInActions.checkInItemByBarcode(itemData.barcodes[0]);
      // Go back to "Lost items requiring actual cost" page
      cy.visit(TopMenu.lostItemsRequiringActualCost);
      // Select "Declared lost" in "Loss type" filter
      LostItemsRequiringActualCostPage.searchByLossType('Declared lost');
      LostItemsRequiringActualCostPage.filterByStatus('Open');
      // Just returned Item disappeared and don`t displayed on "Lost items requiring actual cost" page with status "open"
      LostItemsRequiringActualCostPage.checkResultNotDisplayed(itemData.instanceTitle);
    },
  );
});
