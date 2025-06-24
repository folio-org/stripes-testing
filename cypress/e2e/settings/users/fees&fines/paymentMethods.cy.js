import uuid from 'uuid';
import PaymentMethods from '../../../../support/fragments/settings/users/paymentMethods';
import UsersOwners from '../../../../support/fragments/settings/users/usersOwners';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Fees&Fines', () => {
  describe('Settings Users (Fee/fine)', () => {
    let specialOwnerId;
    before(() => {
      cy.getAdminToken().then(() => {
        UsersOwners.createViaApi({ owner: uuid() }).then(({ id }) => {
          specialOwnerId = id;
        });
        cy.loginAsAdmin({ path: SettingsMenu.paymentsPath, waiter: () => cy.wait(5000) });
      });
    });
    after(() => {
      UsersOwners.deleteViaApi(specialOwnerId);
    });

    it(
      'C445 Verify that you can create/edit/delete payment methods for a fee/fine owner (volaris)',
      { tags: ['smoke', 'volaris', 'shiftLeft', 'C445'] },
      () => {
        // create
        const initialPaymentMethod = { ...PaymentMethods.defaultPaymentMethod };
        PaymentMethods.checkControls();
        PaymentMethods.pressNew();
        PaymentMethods.checkFields();
        PaymentMethods.fillRequiredFields(initialPaymentMethod);
        PaymentMethods.save();
        PaymentMethods.checkCreatedRecord(initialPaymentMethod);

        // update
        const updatedPaymentMethod = { ...PaymentMethods.defaultPaymentMethod };
        updatedPaymentMethod.name = `updatedPaymentMethod${getRandomPostfix()}`;
        updatedPaymentMethod.refundMethodAllowed = { value: false, visibleValue: 'No' };

        PaymentMethods.edit(initialPaymentMethod.name, updatedPaymentMethod);
        PaymentMethods.checkCreatedRecord(updatedPaymentMethod);

        // delete
        PaymentMethods.delete(updatedPaymentMethod.name);
      },
    );
  });
});
