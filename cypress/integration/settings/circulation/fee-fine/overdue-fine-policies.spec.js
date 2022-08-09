import OverdueFinePolicies from '../../../../support/fragments/settings/circulation/fee-fine/overdueFinePolicies';
import SettingsMenu from '../../../../support/fragments/settingsMenu';

describe('ui-circulation-settings: overdue fine policies management', () => {
  beforeEach('Log in', () => {
    cy.loginAsAdmin({ path: SettingsMenu.circulationoVerdueFinePoliciesPath, waiter: OverdueFinePolicies.waitLoading });
  });

  it('C5557: Verify that you can create/edit/delete overdue fine policies', () => {
    // TODO add check that name is unique
    OverdueFinePolicies.openCreatingForm();
    OverdueFinePolicies.checkCreatingForm();
    OverdueFinePolicies.checkOverDueFineInCreating();
    OverdueFinePolicies.fillGeneralInformation('1.00', '2.00', '3.00', '4.00');
    OverdueFinePolicies.save();
    OverdueFinePolicies.checkAfterSave('1.00', '2.00', '3.00', '4.00');

    OverdueFinePolicies.openEditingForm();
    OverdueFinePolicies.checkEditingForm('1.00', '2.00', '3.00', '4.00');
    OverdueFinePolicies.fillGeneralInformation('5.00', '6.00', '7.00', '8.00');
    OverdueFinePolicies.save();
    OverdueFinePolicies.checkAfterSave('5.00', '6.00', '7.00', '8.00');

    OverdueFinePolicies.delete();
    OverdueFinePolicies.checkAfterDelete();
  });
});
