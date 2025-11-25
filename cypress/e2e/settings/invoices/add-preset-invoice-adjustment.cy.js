import Permissions from '../../../support/dictionary/permissions';
import { Adjustments } from '../../../support/fragments/settings/invoices';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import Invoices from '../../../support/fragments/invoices/invoices';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

describe('Invoices', () => {
  describe('Settings (Invoices)', () => {
    const adjustment = Adjustments.getDefaultPresetAdjustment({
      type: 'Amount',
      value: '10',
      prorate: 'Not prorated',
      relationToTotal: 'In addition to',
      exportToAccounting: false,
      alwaysShow: true,
    });
    let user;

    before('Create test data', () => {
      cy.createTempUser([
        Permissions.viewEditCreateInvoiceInvoiceLine.gui,
        Permissions.invoiceSettingsAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.invoiceAdjustmentsPath,
          waiter: Adjustments.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Adjustments.getAdjustmentByDescription(adjustment.description).then((adj) => {
          Adjustments.deleteViaApi(adj.id);
        });
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C10947 Add pre-set invoice adjustment (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C10947'] },
      () => {
        Adjustments.clickNew();
        Adjustments.checkNewAdjustmentForm();
        Adjustments.createAdjustment(adjustment);
        Adjustments.selectAdjustment(adjustment.description);
        Adjustments.checkAdjustmentDetails(adjustment);
        Adjustments.checkActionsMenu();
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
        Invoices.clickNewInvoiceButton();
        Invoices.checkPresetAdjustment(adjustment);
        Invoices.deleteAdjustment(adjustment);
        Invoices.checkAdjustmentAbsent(adjustment);
        Invoices.selectAdjustmentInDropdown(adjustment.description);
        Invoices.clickAddAdjustmentButton();
        Invoices.checkPresetAdjustment(adjustment);
      },
    );
  });
});
