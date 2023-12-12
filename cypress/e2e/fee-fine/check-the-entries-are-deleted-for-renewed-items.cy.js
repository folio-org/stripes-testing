import uuid from 'uuid';

import { getTestEntityValue } from '../../support/utils/stringTools';
import { Permissions } from '../../support/dictionary';
import { Locations, ServicePoints } from '../../support/fragments/settings/tenant';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
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
import RenewConfirmationModal from '../../support/fragments/users/loans/renewConfirmationModal';
import OverrideAndRenewModal from '../../support/fragments/users/loans/overrideAndRenewModal';

describe('Lost items requiring actual cost', () => {
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    servicePoint: ServicePoints.getDefaultServicePoint(),
  };
  const declareLostComments = getTestEntityValue('Some additional information');
  const ownerData = UsersOwners.getDefaultNewOwner();
  let itemData;

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

  before('Create test entities', () => {
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
        testData.owner = ownerResponse;
      });
    });
    itemData = testData.folioInstances[0];
    cy.createTempUser([
      Permissions.uiUserLostItemRequiringActualCost.gui,
      Permissions.loansRenew.gui,
      Permissions.loansRenewOverride.gui,
      Permissions.loansAll.gui,
      Permissions.uiUsersDeclareItemLost.gui,
    ]).then((user) => {
      testData.user = user;
      UserEdit.addServicePointViaApi(
        testData.servicePoint.id,
        testData.user.userId,
        testData.servicePoint.id,
      ).then(() => {
        Checkout.checkoutItemViaApi({
          itemBarcode: testData.folioInstances[0].barcodes[0],
          userBarcode: testData.user.barcode,
          servicePointId: testData.servicePoint.id,
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
        servicePoint: testData.servicePoint,
        shouldCheckIn: true,
      });
      LostItemFeePolicy.deleteViaApi(feePolicyBody.id);
      cy.deleteLoanType(testData.loanTypeId);
      UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePoint.id]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Users.deleteViaApi(testData.user.userId);
      UsersOwners.deleteViaApi(testData.owner.id);
      Locations.deleteViaApi(testData.defaultLocation);
    });
  });

  it(
    'C375274 Check that entries are deleted for renewed items (Declared lost items) (vega) (TaaS)',
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
      LostItemsRequiringActualCostPage.filterByStatus('Open');
      // Just returned Item still displayed on "Lost items requiring actual cost" page
      LostItemsRequiringActualCostPage.checkResultNotDisplayed(itemData.instanceTitle);
    },
  );
});
