import uuid from 'uuid';
import UsersOwners from '../../../support/fragments/settings/users/usersOwners';
import TopMenu from '../../../support/fragments/topMenu';
import UsersCard from '../../../support/fragments/users/usersCard';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import NewFeeFine from '../../../support/fragments/users/newFeeFine';
import { getTestEntityValue } from '../../../support/utils/stringTools';
import TestType from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import { getNewItem } from '../../../support/fragments/inventory/item';
import LoanDetails from '../../../support/fragments/users/userDefaultObjects/loanDetails';
import Checkout from '../../../support/fragments/checkout/checkout';
import permissions from '../../../support/dictionary/permissions';
import UserEdit from '../../../support/fragments/users/userEdit';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import LostItemFeePolicy from '../../../support/fragments/circulation/lost-item-fee-policy';
import CirculationRules from '../../../support/fragments/circulation/circulation-rules';
import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import UsersSearchResultsPane from '../../../support/fragments/users/usersSearchResultsPane';
import UserLoans from '../../../support/fragments/users/loans/userLoans';
import PaymentMethods from '../../../support/fragments/settings/users/paymentMethods';

describe('ui-users-loans: Loans', () => {
  let addedCirculationRule;
  const paymentMethod = {};
  const newOwnerData = UsersOwners.getDefaultNewOwner();
  const newFirstItemData = getNewItem();
  const declareLostComments = getTestEntityValue('Some additional information');
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  const itemsData = {};
  let originalCirculationRules;

  const lostItemFeePolicyBody = {
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

  beforeEach(() => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.createViaApi(testData.userServicePoint);
        testData.defaultLocation = Location.getDefaultLocation(testData.userServicePoint.id);
        Location.createViaApi(testData.defaultLocation);
        cy.createLoanType({
          name: getTestEntityValue('feeFine'),
        }).then((loanType) => {
          testData.loanTypeId = loanType.id;
        });
        cy.getMaterialTypes({ limit: 1 });
        cy.getInstanceTypes({ limit: 1 });
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
      PaymentMethods.createViaApi(testData.ownerId).then(({ name, id }) => {
        paymentMethod.name = name;
        paymentMethod.id = id;
      });
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
      permissions.checkoutAll.gui,
      permissions.uiUsersfeefinesView.gui,
      permissions.uiUsersView.gui,
      permissions.uiUsersDeclareItemLost.gui,
    ]).then(({ username, password, userId, barcode }) => {
      testData.userId = userId;
      UserEdit.addServicePointViaApi(
        testData.userServicePoint.id,
        userId,
        testData.userServicePoint.id,
      ).then(() => {
        Checkout.checkoutItemViaApi({
          itemBarcode: newFirstItemData.barcode,
          userBarcode: barcode,
          servicePointId: testData.userServicePoint.id,
        });
        // there are three steps to visit users application because in this case we are getting all needed requests and responses.
        cy.login(username, password);
        cy.visit(TopMenu.usersPath);
        UsersSearchResultsPane.waitLoading();
      });
    });
  });

  after('Deleting created entities', () => {
    CirculationRules.deleteRuleViaApi(addedCirculationRule);
    CheckInActions.checkinItemViaApi({
      itemBarcode: newFirstItemData.barcode,
      servicePointId: testData.userServicePoint.id,
      checkInDate: new Date().toISOString(),
    });
    NewFeeFine.getUserFeesFines(testData.userId).then((userFeesFines) => {
      const feesFinesData = userFeesFines.accounts;
      feesFinesData.forEach(({ id }) => {
        cy.deleteFeesFinesApi(id);
      });
    });

    itemsData.itemsId.forEach((id) => {
      cy.deleteItemViaApi(id);
    });
    LostItemFeePolicy.deleteViaApi(lostItemFeePolicyBody.id);
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
    'C365133 Verify ACTUAL COST lost items are being billed the "Lost item processing fee" when declared lost',
    { tags: [TestType.criticalPath, DevTeams.vega] },
    () => {
      UsersSearchPane.searchByKeywords(testData.userId);
      UsersSearchPane.openUser(testData.userId);
      UsersCard.waitLoading();
      UsersCard.viewCurrentLoans();

      UserLoans.openLoanDetails(newFirstItemData.barcode);

      LoanDetails.checkAction(0, 'Checked out');
      LoanDetails.startDeclareLost();
      LoanDetails.finishDeclareLost(declareLostComments);
      LoanDetails.checkAction(0, 'Declared lost');
      LoanDetails.checkKeyValue('Fees/fines incurred', '25.00');
    },
  );
});
