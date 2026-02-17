import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import ClosingReasons from '../../../support/fragments/settings/orders/closingPurchaseOrderReasons';
import settingsMenu from '../../../support/fragments/settingsMenu';

describe('Settings (Orders) - Closing purchase order reasons', () => {
  const { reason: closingReason } = { ...ClosingReasons.defaultClosingReason };
  const closingReasonEdited = `${closingReason}-edited`;
  let user;

  before('Create user and login', () => {
    cy.getAdminToken();
    cy.createTempUser([permissions.uiSettingsOrdersCanViewAndEditAllSettings.gui]).then(
      (userProps) => {
        user = userProps;
        cy.login(user.username, user.password, {
          path: settingsMenu.ordersClosingPurchaseOrderReasonsPath,
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
    { tags: ['extended', 'thunderjet', 'C15854'] },
    () => {
      ClosingReasons.createClosingReason(closingReason);
      ClosingReasons.editClosingReason(closingReason, closingReasonEdited);
      ClosingReasons.deleteClosingReason(closingReasonEdited);
      ClosingReasons.verifyClosingReasonAbsent(closingReasonEdited);
      ClosingReasons.verifySystemClosingReasonNotEditable('Cancelled');
    },
  );
});
