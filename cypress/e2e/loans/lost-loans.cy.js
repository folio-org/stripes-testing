import uuid from 'uuid';
import moment from 'moment';

import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Users from '../../support/fragments/users/users';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import UserEdit from '../../support/fragments/users/userEdit';
import getRandomPostfix from '../../support/utils/stringTools';
import LostItemFeePolicy from '../../support/fragments/circulation/lost-item-fee-policy';
import AppPaths from '../../support/fragments/app-paths';
import Checkout from '../../support/fragments/checkout/checkout';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import PaymentMethods from '../../support/fragments/settings/users/paymentMethods';
import LoanDetails from '../../support/fragments/users/userDefaultObjects/loanDetails';
import PayFeeFaine from '../../support/fragments/users/payFeeFaine';
import FeeFinesDetails from '../../support/fragments/users/feeFineDetails';
import UserAllFeesFines from '../../support/fragments/users/userAllFeesFines';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import { DevTeams, TestTypes, Permissions } from '../../support/dictionary';

let userId;
const ownerData = {};
const feeFineType = {};
let materialTypes;
let testData;
let userData;
let originalCirculationRules;
let addedCirculationRule;
let totalAmount;
const lostItemFeePolicies = [
  {
    name: 'lost_item_fee_policy_A' + getRandomPostfix(),
    chargeAmountItem: {
      chargeType: 'setCost',
      amount: 20.0,
    },
    lostItemProcessingFee: 0.0,
    chargeAmountItemPatron: false,
    lostItemReturned: 'Charge',
    id: uuid(),
  },
  {
    name: 'lost_item_fee_policy_B' + getRandomPostfix(),
    chargeAmountItem: {
      chargeType: 'setCost',
      amount: 10.0,
    },
    lostItemProcessingFee: 30.0,
    chargeAmountItemPatron: true,
    lostItemReturned: 'Charge',
    id: uuid(),
  },
  {
    name: 'lost_item_fee_policy_C' + getRandomPostfix(),
    chargeAmountItem: {
      chargeType: 'setCost',
      amount: 0.0,
    },
    lostItemProcessingFee: 50.0,
    chargeAmountItemPatron: true,
    lostItemReturned: 'Charge',
    id: uuid(),
  },
  {
    name: 'lost_item_fee_policy_D' + getRandomPostfix(),
    chargeAmountItem: {
      chargeType: 'setCost',
      amount: 0.0,
    },
    lostItemProcessingFee: 25.0,
    chargeAmountItemPatron: true,
    lostItemReturned: 'Charge',
    id: uuid(),
  },
];

describe('Lost loan', () => {
  before('Create test data', () => {
    cy.createTempUser([
      Permissions.uiUsersDeclareItemLost.gui,
      Permissions.uiUsersManualPay.gui,
      Permissions.uiUsersViewLoans.gui,
      Permissions.uiFeeFines.gui,
      Permissions.uiUsersfeefinesView.gui,
    ]).then((userProperties) => {
      userData = userProperties;
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password);
      cy.getAdminToken().then(async () => {
        InventoryInstances.getMaterialTypes({ limit: 4 })
          .then((materialTypesRes) => {
            materialTypes = materialTypesRes;
          })
          .then(() => {
            testData = {
              folioInstances: InventoryInstances.generateFolioInstances({
                count: 4,
                materialTypes,
              }),
              servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
              requestsId: '',
            };
            ServicePoints.createViaApi(testData.servicePoint);
            testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
            Location.createViaApi(testData.defaultLocation).then((location) => {
              InventoryInstances.createFolioInstancesViaApi({
                folioInstances: testData.folioInstances,
                location,
              });
            });
          })
          .then(() => {
            UserEdit.addServicePointViaApi(testData.servicePoint.id, userId);
          })
          .then(() => {
            lostItemFeePolicies.forEach((policy) => LostItemFeePolicy.createViaApi(policy));
            CirculationRules.getViaApi().then((circulationRule) => {
              originalCirculationRules = circulationRule.rulesAsText;
              const ruleProps = CirculationRules.getRuleProps(circulationRule.rulesAsText);
              const defaultProps = [];

              for (let i = 0; i < lostItemFeePolicies.length; i++) {
                defaultProps[
                  i
                ] = ` i ${lostItemFeePolicies[i].id} r ${ruleProps.r} o ${ruleProps.o} n ${ruleProps.n} l ${ruleProps.l}`;
              }
              addedCirculationRule = materialTypes
                .map((materialType, index) => {
                  return `\nm ${materialType.id}: ${defaultProps[index]}`;
                })
                .join('');
              CirculationRules.updateCirculationRules({
                rulesAsText: `${originalCirculationRules}${addedCirculationRule}`,
              });
            });

            UsersOwners.createViaApi(UsersOwners.getDefaultNewOwner(uuid(), 'owner'))
              .then(({ id, desc }) => {
                ownerData.name = desc;
                ownerData.id = id;
              })
              .then(() => {
                PaymentMethods.createViaApi(ownerData.id).then((paymentMethodRes) => {
                  testData.paymentMethod = paymentMethodRes;
                });
                UsersOwners.addServicePointsViaApi(ownerData, [testData.servicePoint]);
                ManualCharges.createViaApi({
                  ...ManualCharges.defaultFeeFineType,
                  ownerId: ownerData.id,
                }).then((manualCharge) => {
                  feeFineType.id = manualCharge.id;
                  feeFineType.name = manualCharge.feeFineType;
                  feeFineType.amount = manualCharge.amount;
                  totalAmount = lostItemFeePolicies[3].lostItemProcessingFee + feeFineType.amount;
                });
              });
            testData.folioInstances.forEach((instance) => {
              Checkout.checkoutItemViaApi({
                id: uuid(),
                itemBarcode: instance.barcodes[0],
                loanDate: moment.utc().format(),
                servicePointId: testData.servicePoint.id,
                userBarcode: userData.barcode,
              });
            });
            cy.login(userProperties.username, userProperties.password);
          });
      });
    });
  });

  after('Delete test data', () => {
    CirculationRules.deleteRuleViaApi(addedCirculationRule);
    testData.folioInstances.forEach((instance) => {
      CheckInActions.checkinItemViaApi({
        itemBarcode: instance.barcodes[0],
        servicePointId: testData.servicePoint.id,
        checkInDate: new Date().toISOString(),
      });
    });
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    lostItemFeePolicies.forEach((policy) => {
      LostItemFeePolicy.deleteViaApi(policy.id);
    });
    Users.deleteViaApi(userData.userId);
    PaymentMethods.deleteViaApi(testData.paymentMethod.id);
    ManualCharges.deleteViaApi(feeFineType.id);
    UsersOwners.deleteViaApi(ownerData.id);
    testData.folioInstances.forEach((item) => {
      InventoryInstances.deleteInstanceViaApi({
        instance: item,
        servicePoint: testData.servicePoint,
        shouldCheckIn: true,
      });
    });
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
  });

  it(
    'C10949: Close declared lost loan (set cost lost item fees) (vega) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.vega] },
    () => {
      const comment = 'Declare lost';
      // Navigate to open loan "A".
      cy.visit(AppPaths.getOpenLoansPath(userId));
      UserLoans.openLoanDetails(testData.folioInstances[0].barcodes[0]);
      // Declare item lost.
      LoanDetails.checkAction(0, 'Checked out');
      LoanDetails.startDeclareLost();
      LoanDetails.finishDeclareLost(comment);
      // Navigate to the loan details for loan "A" and check closed loan details.
      LoanDetails.checkAction(0, 'Closed loan');
      LoanDetails.checkStatusInList(0, 'Lost and paid');
      LoanDetails.checkSourceName(0, 'System');
      LoanDetails.checkComments(0, '-');

      // Navigate to open loan "B".
      cy.visit(AppPaths.getOpenLoansPath(userId));
      UserLoans.openLoanDetails(testData.folioInstances[1].barcodes[0]);
      // Declare item lost.
      LoanDetails.checkAction(0, 'Checked out');
      LoanDetails.startDeclareLost();
      LoanDetails.finishDeclareLost(comment);
      // Navigate to the loan details for loan "B" and check loan declared lost.
      LoanDetails.checkAction(0, 'Declared lost');
      LoanDetails.checkStatusInList(0, 'Declared lost');
      LoanDetails.checkSourceName(0, userData.username);
      LoanDetails.checkComments(0, comment);
      // Navigate to the fee and pay the total amount.
      LoanDetails.openFeeFine();
      FeeFinesDetails.openActions().then(() => {
        FeeFinesDetails.openPayModal();
      });
      PayFeeFaine.checkAmount(lostItemFeePolicies[1].lostItemProcessingFee);
      PayFeeFaine.setPaymentMethod(testData.paymentMethod);
      PayFeeFaine.setAmount(lostItemFeePolicies[1].lostItemProcessingFee);
      PayFeeFaine.checkRestOfPay(lostItemFeePolicies[1].lostItemProcessingFee);
      PayFeeFaine.submitAndConfirm();
      // Navigate to closed loan details for loan "B" and check closed loan details.
      cy.visit(AppPaths.getClosedLoansPath(userId));
      UserLoans.openLoanDetails(testData.folioInstances[1].barcodes[0]);
      LoanDetails.checkAction(0, 'Closed loan');
      LoanDetails.checkStatusInList(0, 'Lost and paid');
      LoanDetails.checkSourceName(0, 'System');
      LoanDetails.checkComments(0, '-');

      // Navigate to loan "C".
      cy.visit(AppPaths.getOpenLoansPath(userId));
      UserLoans.openLoanDetails(testData.folioInstances[2].barcodes[0]);
      // Declare item lost.
      LoanDetails.checkAction(0, 'Checked out');
      LoanDetails.startDeclareLost();
      LoanDetails.finishDeclareLost(comment);
      // Navigate to the fee and pay the total amount.
      LoanDetails.openFeeFine();
      FeeFinesDetails.openActions().then(() => {
        FeeFinesDetails.openPayModal();
      });
      PayFeeFaine.checkAmount(lostItemFeePolicies[2].lostItemProcessingFee);
      PayFeeFaine.setPaymentMethod(testData.paymentMethod);
      PayFeeFaine.setAmount(lostItemFeePolicies[2].lostItemProcessingFee);
      PayFeeFaine.checkRestOfPay(lostItemFeePolicies[2].lostItemProcessingFee);
      PayFeeFaine.submitAndConfirm();
      // Navigate to closed loan details for loan "C" and check closed loan details.
      cy.visit(AppPaths.getClosedLoansPath(userId));
      UserLoans.openLoanDetails(testData.folioInstances[2].barcodes[0]);
      LoanDetails.checkAction(0, 'Closed loan');
      LoanDetails.checkStatusInList(0, 'Lost and paid');
      LoanDetails.checkSourceName(0, 'System');
      LoanDetails.checkComments(0, '-');

      // Navigate to loan "D".
      cy.visit(AppPaths.getOpenLoansPath(userId));
      UserLoans.createNewFeeFine(
        testData.folioInstances[3].barcodes[0],
        ownerData.name,
        feeFineType.name,
      );
      UserLoans.openLoanDetails(testData.folioInstances[3].barcodes[0]);
      // Declare item lost.
      LoanDetails.checkAction(0, 'Checked out');
      LoanDetails.startDeclareLost();
      LoanDetails.finishDeclareLost(comment);
      LoanDetails.checkKeyValue('Fees/fines incurred', `${totalAmount}.00`);
      // Navigate to the fee and pay the total combined amount.
      LoanDetails.openFeeFine();
      cy.wait(1000);
      UserAllFeesFines.selectAllFeeFines();
      FeeFinesDetails.openActions().then(() => {
        FeeFinesDetails.openPayModal();
      });
      PayFeeFaine.checkAmount(totalAmount);
      PayFeeFaine.setPaymentMethod(testData.paymentMethod);
      PayFeeFaine.setAmount(totalAmount);
      PayFeeFaine.checkRestOfPay(totalAmount);
      PayFeeFaine.submitAndConfirm();
      // Navigate to closed loan details for loan "D" and check closed loan details.
      cy.visit(AppPaths.getClosedLoansPath(userId));
      UserLoans.openLoanDetails(testData.folioInstances[3].barcodes[0]);
      LoanDetails.checkAction(0, 'Closed loan');
      LoanDetails.checkStatusInList(0, 'Lost and paid');
      LoanDetails.checkSourceName(0, 'System');
      LoanDetails.checkComments(0, '-');
    },
  );
});
