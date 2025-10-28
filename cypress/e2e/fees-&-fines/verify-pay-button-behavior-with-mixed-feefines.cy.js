import { Permissions } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import UserAllFeesFines from '../../support/fragments/users/userAllFeesFines';
import PayFeeFine from '../../support/fragments/users/payFeeFine';
import PaymentMethods from '../../support/fragments/settings/users/paymentMethods';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Verify behavior when "Pay" button pressed within "All" tab of Fee/Fine History page with 2 or more fees/fines selected and 1 or more of selected fees/fines closed', () => {
  let userData = {};
  let feeFineOwner;
  let manualCharge;
  const paymentMethod = {};
  let servicePoint;
  const createdFeeFines = [];

  before('Create test data', () => {
    cy.getAdminToken();
    servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
    ServicePoints.createViaApi(servicePoint);

    cy.createTempUser([
      Permissions.uiUsersfeefinesCRUD.gui,
      Permissions.uiUsersfeefinesView.gui,
      Permissions.uiFeeFinesActions.gui,
      Permissions.uiUsersView.gui,
    ])
      .then((userProperties) => {
        userData = userProperties;
        UserEdit.addServicePointViaApi(servicePoint.id, userData.userId);
        UsersOwners.createViaApi(UsersOwners.getDefaultNewOwner());
      })
      .then((ownerResponse) => {
        feeFineOwner = ownerResponse;
        UsersOwners.addServicePointsViaApi(feeFineOwner, [servicePoint]);
        PaymentMethods.createViaApi(feeFineOwner.id);
      })
      .then(({ name, id }) => {
        paymentMethod.name = name;
        paymentMethod.id = id;

        const chargeData = {
          feeFineType: 'TestManualCharge' + getRandomPostfix(),
          defaultAmount: 15.0,
          ownerId: feeFineOwner.id,
          automatic: false,
        };
        ManualCharges.createViaApi(chargeData);
      })
      .then((chargeResponse) => {
        manualCharge = chargeResponse;

        const feeFinesToCreate = [
          { amount: 10.0 },
          { amount: 25.0 },
          { amount: 5.0 },
          { amount: 30.0 },
        ];

        Cypress.Promise.all(
          feeFinesToCreate.map((feeFine) => {
            const feeFineAccount = {
              userId: userData.userId,
              feeFineId: manualCharge.id,
              ownerId: feeFineOwner.id,
              amount: feeFine.amount,
              feeFineType: manualCharge.feeFineType,
            };

            return NewFeeFine.createViaApi(feeFineAccount).then((feeFineAccountId) => {
              feeFineAccount.id = feeFineAccountId;
              createdFeeFines.push(feeFineAccount);
              return feeFineAccountId;
            });
          }),
        );
      })
      .then(() => {
        cy.getAdminSourceRecord()
          .then((adminSourceRecord) => {
            const payBody = {
              amount: createdFeeFines[0].amount,
              paymentMethod: paymentMethod.name,
              notifyPatron: false,
              servicePointId: servicePoint.id,
              userName: adminSourceRecord,
            };
            PayFeeFine.payFeeFineViaApi(payBody, createdFeeFines[0].id);
          })
          .then(() => {
            cy.login(userData.username, userData.password, {
              path: TopMenu.usersPath,
              waiter: UsersSearchPane.waitLoading,
            });
          });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    createdFeeFines.forEach((feeFine) => {
      NewFeeFine.deleteFeeFineAccountViaApi(feeFine.id);
    });
    ManualCharges.deleteViaApi(manualCharge.id);
    PaymentMethods.deleteViaApi(paymentMethod.id);
    UsersOwners.deleteViaApi(feeFineOwner.id);
    Users.deleteViaApi(userData.userId);
    ServicePoints.deleteViaApi(servicePoint.id);
  });

  it(
    'C5563 Verify behavior when "Pay" button pressed within "All" tab of Fee/Fine History page with 2 or more fees/fines selected and 1 or more of selected fees/fines closed (vega)',
    { tags: ['extendedPath', 'vega', 'C5563'] },
    () => {
      // Find user and expand Fees/Fines section
      UsersSearchPane.searchByUsername(userData.username);
      UsersSearchPane.selectUserFromList(userData.username);
      UsersCard.waitLoading();
      UsersCard.openFeeFines();

      UsersCard.viewAllFeesFines();
      UserAllFeesFines.waitLoading();
      UserAllFeesFines.goToAllFeeFines();

      // Select multiple fees/fines including closed one (3 is paid, 0,1,2 are open)
      UserAllFeesFines.clickRowCheckbox(0);
      UserAllFeesFines.clickRowCheckbox(1);
      UserAllFeesFines.clickRowCheckbox(2);
      UserAllFeesFines.clickRowCheckbox(3);
      UserAllFeesFines.paySelectedFeeFines();

      // Verify warning modal appears for closed fee/fine
      PayFeeFine.verifyDeselectToContinueText();
      PayFeeFine.verifyContinueIsDisabled();
      PayFeeFine.deselectFeeFine();
      PayFeeFine.clickContinue();

      PayFeeFine.waitLoading();
      cy.reload();
      UserAllFeesFines.clickRowCheckbox(0);
      UserAllFeesFines.clickRowCheckbox(1);
      UserAllFeesFines.clickRowCheckbox(2);
      UserAllFeesFines.paySelectedFeeFines();
      PayFeeFine.setPaymentMethod(paymentMethod);

      // Test partial payment - reduce the payment amount
      const partialAmount = 50.0;
      PayFeeFine.setAmount(partialAmount);
      PayFeeFine.checkPartialPayConfirmation();
      PayFeeFine.submitAndConfirm();

      // Verify payment statuses
      UserAllFeesFines.verifyPaymentStatus(0, 'Paid partially');
      UserAllFeesFines.verifyPaymentStatus(1, 'Paid fully');
      UserAllFeesFines.verifyPaymentStatus(2, 'Paid partially');
    },
  );
});
