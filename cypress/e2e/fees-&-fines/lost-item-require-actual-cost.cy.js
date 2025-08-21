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
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import LoanDetails from '../../support/fragments/users/userDefaultObjects/loanDetails';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersSearchResultsPane from '../../support/fragments/users/usersSearchResultsPane';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Fees&Fines', () => {
  describe('Lost items requiring actual cost', () => {
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances(),
      userServicePoint: ServicePoints.getDefaultServicePoint(),
    };
    let itemData;
    const declareLostComments = getTestEntityValue('Some additional information');
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

    before('Create test data', () => {
      cy.getAdminToken();
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
          itemData = testData.folioInstances[0];
        })
        .then(() => {
          cy.getItems({
            limit: 1,
            expandAll: true,
            query: `"barcode"==${itemData.barcodes[0]}`,
          }).then((res) => {
            testData.materialTypeId = res.materialType.id;
          });
        })
        .then(() => {
          LostItemFeePolicy.createViaApi(lostItemFeePolicy);
          CirculationRules.addRuleViaApi(
            { m: testData.materialTypeId },
            { i: lostItemFeePolicy.id },
          ).then((newRule) => {
            testData.addedRule = newRule;
          });
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
      });

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
      cy.getAdminToken();
      CirculationRules.deleteRuleViaApi(testData.addedRule);
      NewFeeFine.getUserFeesFines(testData.user.userId).then((userFeesFines) => {
        const feesFinesData = userFeesFines.accounts;
        cy.wrap(feesFinesData).each(({ id }) => {
          cy.deleteFeesFinesApi(id);
        });
      });
      InventoryInstances.deleteInstanceViaApi({
        instance: testData.folioInstances[0],
        servicePoint: testData.userServicePoint,
        shouldCheckIn: true,
      });
      LostItemFeePolicy.deleteViaApi(lostItemFeePolicy.id);
      Users.deleteViaApi(testData.user.userId);
      UsersOwners.deleteViaApi(testData.ownerId);
      Locations.deleteViaApi(testData.defaultLocation);
    });

    it(
      'C375286 Check that entries are NOT deleted for returned items (Declared lost items) when item is returned after "No fees/fines shall be refunded if a lost item is returned more than" parameter (vega) (TaaS)',
      { tags: ['extendedPath', 'vega', 'C375286'] },
      () => {
        cy.visit(TopMenu.usersPath);
        cy.waitForAuthRefresh(() => {}, 20_000);
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
        // Just returned Item still displayed on "Lost items requiring actual cost" page
        LostItemsRequiringActualCostPage.checkResultsLossType(
          itemData.instanceTitle,
          'Declared lost',
        );
      },
    );
  });
});
