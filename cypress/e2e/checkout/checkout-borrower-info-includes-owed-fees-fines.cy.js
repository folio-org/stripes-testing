import uuid from 'uuid';
import { Permissions } from '../../support/dictionary';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';

describe('Checkout', () => {
  describe('Borrower info includes owed fees/fines information', () => {
    const owner = UsersOwners.getDefaultNewOwner({ name: `owner-${uuid()}` });
    let testUser;
    let staffUser;
    let ownerId;
    let servicePoint;
    let manualCharge;
    let feeFineAccount;

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => ServicePoints.getCircDesk1ServicePointViaApi())
        .then((circDesk1) => {
          servicePoint = circDesk1;
          UsersOwners.createViaApi(owner);
        })
        .then((ownerResponse) => {
          ownerId = ownerResponse.id;
          owner.name = ownerResponse.owner;
          UsersOwners.addServicePointsViaApi(owner, [servicePoint]);
        })
        .then(() => ManualCharges.createViaApi({ ...ManualCharges.defaultFeeFineType, ownerId }))
        .then((charge) => {
          manualCharge = charge;
          cy.createTempUser([]);
        })
        .then((userProps) => {
          testUser = userProps;
          UserEdit.addServicePointViaApi(servicePoint.id, testUser.userId);
        })
        .then(() => cy.createTempUser([Permissions.checkoutAll.gui, Permissions.uiUsersfeefinesView.gui]))
        .then((staffUserProps) => {
          staffUser = staffUserProps;
          UserEdit.addServicePointViaApi(servicePoint.id, staffUser.userId, servicePoint.id);
        })
        .then(() => {
          cy.waitForAuthRefresh(() => {
            cy.login(staffUser.username, staffUser.password, {
              path: TopMenu.checkOutPath,
              waiter: CheckOutActions.waitLoading,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testUser.userId);
      Users.deleteViaApi(staffUser.userId);
      NewFeeFine.deleteFeeFineAccountViaApi(feeFineAccount.id);
      UsersOwners.deleteViaApi(ownerId);
      ManualCharges.deleteViaApi(manualCharge.id);
    });

    it(
      'C473 Verify that "Checkout" borrower info includes owed fees/fines information (vega)',
      { tags: ['extendedPath', 'vega', 'C473'] },
      () => {
        // Patron without outstanding fees/fines
        CheckOutActions.checkOutUser(testUser.barcode);
        CheckOutActions.verifyFeeFinesOwed('0.00');
        CheckOutActions.endCheckOutSession();

        // Create a fee/fine for the user
        feeFineAccount = {
          id: uuid(),
          ownerId,
          feeFineId: manualCharge.id,
          amount: 123.45,
          userId: testUser.userId,
          feeFineType: manualCharge.feeFineType,
          feeFineOwner: owner.name,
          createdAt: servicePoint.id,
          dateAction: new Date().toISOString(),
        };

        cy.getAdminToken()
          .then(() => NewFeeFine.createViaApi(feeFineAccount))
          .then((feeFineAccountId) => {
            feeFineAccount.id = feeFineAccountId;

            // Same patron now with outstanding fees/fines
            CheckOutActions.checkOutUser(testUser.barcode);
            CheckOutActions.verifyFeeFinesOwed('123.45');
          });
      },
    );
  });
});
