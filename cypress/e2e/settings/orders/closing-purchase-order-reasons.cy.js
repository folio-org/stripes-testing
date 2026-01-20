import Permissions from '../../../support/dictionary/permissions';
import ClosingReasons from '../../../support/fragments/settings/orders/closingPurchaseOrderReasons';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';

describe('Orders', () => {
  describe('Settings (Orders)', () => {
    const { reason: closingReason } = { ...ClosingReasons.defaultClosingReason };
    const closingReasonEdited = `${closingReason}-edited`;
    let user;

    before('Create user and login', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.uiSettingsOrdersCanViewAndEditAllSettings.gui]).then(
        (userProps) => {
          user = userProps;
          cy.login(user.username, user.password, {
            path: SettingsMenu.ordersClosingPurchaseOrderReasonsPath,
            waiter: ClosingReasons.waitLoading,
          });
        },
      );
    });

    after('Delete test user', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C15854 Create, edit and delete closing purchase order reasons (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C15854'] },
      () => {
        ClosingReasons.createClosingReason(closingReason);
        ClosingReasons.editClosingReason(closingReason, closingReasonEdited);
        ClosingReasons.deleteClosingReason(closingReasonEdited);
        ClosingReasons.verifyClosingReasonAbsent(closingReasonEdited);
        ClosingReasons.verifySystemClosingReasonNotEditable('Cancelled');
      },
    );
  });
});
