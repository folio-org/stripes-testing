import uuid from 'uuid';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import UsersOwners from '../../../support/fragments/settings/users/usersOwners';
import PaymentMethods from '../../../support/fragments/settings/users/paymentMethods';
import getRandomPostfix from '../../../support/utils/stringTools';
import features from '../../../support/dictionary/features';

describe('ui-users-settings: payments methods in Fee/fine', () => {
  let specialOwnerId;
  before(() => {
    cy.loginAsAdmin();
    cy.getAdminToken().then(() => {
      UsersOwners.createViaApi({ owner: uuid() }).then(({ id }) => {
        specialOwnerId = id;
      });
      cy.visit(SettingsMenu.paymentsPath);
    });
  });
  after(() => {
    UsersOwners.deleteViaApi(specialOwnerId);
  });

  it(
    'C445 Verify that you can create/edit/delete payment methods for a fee/fine owner (volaris)',
    { tags: ['smoke', features.paymentMethod, 'volaris', 'system'] },
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
