import { APPLICATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import ClosingReasons from '../../../support/fragments/settings/orders/closingPurchaseOrderReasons';
import SettingOrdersNavigationMenu from '../../../support/fragments/settings/orders/settingOrdersNavigationMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

describe('Orders', () => {
  describe('Settings (Orders)', () => {
    let user;
    const { reason: closingReason } = { ...ClosingReasons.defaultClosingReason };
    const closingReasonEdited = `${closingReason}-edited`;

    before('Create user and login', () => {
      cy.createTempUser([Permissions.uiSettingsOrdersCanViewAndEditAllSettings.gui]).then(
        (userProps) => {
          user = userProps;

          cy.login(user.username, user.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.ORDERS);
          SettingOrdersNavigationMenu.selectClosingPurchaseOrderReasons();
          ClosingReasons.waitLoading();
        },
      );
    });

    after('Delete test user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
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
