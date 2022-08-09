import overdueFinePolicies from '../../../../support/fragments/settings/circulation/fee-fine/overdueFinePolicies';
import settingsMenu from '../../../../support/fragments/settingsMenu';

describe('ui-circulation-settings: overdue fine policies management', () => {
  beforeEach('Log in', () => {
    cy.loginAsAdmin({ path: settingsMenu.circulationoVerdueFinePoliciesPath, waiter: overdueFinePolicies.waitLoading });
  });

  it('C5557: Verify that you can create/edit/delete overdue fine policies', () => {
    // TODO add check that name is unique
    overdueFinePolicies.openCreatingForm();
    overdueFinePolicies.checkCreatingForm();
    overdueFinePolicies.checkOverDueFineInCreating();
    overdueFinePolicies.fillGeneralInformation('1.00', '2.00', '3.00', '4.00');
    overdueFinePolicies.save();
    overdueFinePolicies.checkAfterSave('1.00', '2.00', '3.00', '4.00');

    overdueFinePolicies.openEditingForm();
    overdueFinePolicies.checkEditingForm('1.00', '2.00', '3.00', '4.00');
    overdueFinePolicies.fillGeneralInformation('5.00', '6.00', '7.00', '8.00');
    overdueFinePolicies.save();
    overdueFinePolicies.checkAfterSave('5.00', '6.00', '7.00', '8.00');

    overdueFinePolicies.delete();
    overdueFinePolicies.checkAfterDelete();
  });
});
