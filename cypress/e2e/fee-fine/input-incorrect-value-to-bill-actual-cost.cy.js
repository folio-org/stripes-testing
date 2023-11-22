import uuid from 'uuid';
import moment from 'moment/moment';

import { DevTeams, Permissions, TestTypes } from '../../support/dictionary';
import { Locations, ServicePoints } from '../../support/fragments/settings/tenant';
import { getTestEntityValue } from '../../support/utils/stringTools';
import LostItemsRequiringActualCostPage from '../../support/fragments/users/lostItemsRequiringActualCostPage';
import UsersSearchResultsPane from '../../support/fragments/users/usersSearchResultsPane';
import BillActualCostModal from '../../support/fragments/users/billActualCostModal';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import LostItemFeePolicy from '../../support/fragments/circulation/lost-item-fee-policy';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import UserEdit from '../../support/fragments/users/userEdit';
import Checkout from '../../support/fragments/checkout/checkout';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import NewFeeFine from '../../support/fragments/users/newFeeFine';

describe('Lost items requiring actual cost', () => {
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    servicePoint: ServicePoints.getDefaultServicePoint(),
  };
  const ownerData = UsersOwners.getDefaultNewOwner();
  const feePolicy = {
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
  let itemData;

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
          cy.getItems({
            limit: 1,
            expandAll: true,
            query: `"barcode"=="${itemData.barcodes[0]}"`,
          }).then((res) => {
            res.permanentLoanType = { id: testData.loanTypeId };
            cy.updateItemViaApi(res);
          });
        })
        .then(() => {
          LostItemFeePolicy.createViaApi(feePolicy);
          CirculationRules.addRuleViaApi({ t: testData.loanTypeId }, { i: feePolicy.id }).then(
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
      UserLoans.getUserLoansIdViaApi(user.userId).then((userLoans) => {
        UserLoans.declareLoanLostViaApi(
          {
            servicePointId: testData.servicePoint.id,
            declaredLostDateTime: moment.utc().format(),
          },
          userLoans.loans[0].id,
        );
      });
    });
  });

  after('Delete test data', () => {
    NewFeeFine.getUserFeesFines(testData.userData.userId).then((userFeesFines) => {
      const feesFinesData = userFeesFines.accounts;
      feesFinesData.forEach(({ id }) => {
        cy.deleteFeesFinesApi(id);
      });
    });
    CirculationRules.deleteRuleViaApi(testData.addedRule);
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint: testData.servicePoint,
      shouldCheckIn: true,
    });
    LostItemFeePolicy.deleteViaApi(feePolicy.id);
    cy.deleteLoanType(testData.loanTypeId);
    Users.deleteViaApi(testData.userData.userId);
    UsersOwners.deleteViaApi(testData.ownerId);
    Locations.deleteViaApi(testData.defaultLocation);
  });

  it(
    'C374123 Verify ability to input incorrect value to bill actual cost for item with "Declared lost" status (vega) (TaaS)',
    {
      tags: [TestTypes.extendedPath, DevTeams.vega],
    },
    () => {
      const firstValue = '0.00';
      const secondValue = '10000.00';

      // Click on "Actions" dropdown => click "Lost items requiring actual cost" action => select "Declared lost" in "Loss type" filter
      UsersSearchPane.openLostItemsRequiringActualCostPane();
      LostItemsRequiringActualCostPage.searchByLossType('Declared lost');

      // Click "..." in the "Actions" column => select "Bill actual cost" option
      LostItemsRequiringActualCostPage.openBillActualCost(itemData.instanceTitle);
      BillActualCostModal.waitLoading();

      // Put the cursor in "Actual cost to bill patron*" field and then click behind the field
      BillActualCostModal.fillActualCost(firstValue);
      BillActualCostModal.checkActualCostFieldValidation(firstValue);

      // // Fill "Actual cost to bill patron*" with incorrect value (f.e. more than 9999.99)
      BillActualCostModal.fillActualCost(secondValue);
      BillActualCostModal.checkActualCostFieldValidation(secondValue);

      // Click "x" button
      BillActualCostModal.closeModal();

      // "Lost items requiring actual cost" page is displayed
      LostItemsRequiringActualCostPage.waitLoading();

      // Record of item that wanted to bill actual cost is in the list
      LostItemsRequiringActualCostPage.checkResultsLossType(
        itemData.instanceTitle,
        'Declared lost',
      );
    },
  );
});
