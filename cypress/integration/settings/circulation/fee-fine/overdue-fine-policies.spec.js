import devTeams from '../../../../support/dictionary/devTeams';
import testTypes from '../../../../support/dictionary/testTypes';
import OverdueFinePolicies from '../../../../support/fragments/settings/circulation/fee-fine/overdueFinePolicies';
import SettingsMenu from '../../../../support/fragments/settingsMenu';

describe('ui-circulation-settings: overdue fine policies management', () => {
  beforeEach('Log in', () => {
    cy.loginAsAdmin({ path: SettingsMenu.circulationoVerdueFinePoliciesPath, waiter: OverdueFinePolicies.waitLoading });
  });

  it('C5557: Verify that you can create/edit/delete overdue fine policies (spitfire)', { tags: [devTeams.spitfire, testTypes.smoke] }, () => {
    // TODO add check that name is unique
    const overduePolicyProps = ['1.00', '2.00', '3.00', '4.00'];
    const editedOverduePolicyProps = ['5.00', '6.00', '7.00', '8.00'];

    OverdueFinePolicies.openCreatingForm();
    OverdueFinePolicies.checkCreatingForm();
    OverdueFinePolicies.checkOverDueFineInCreating();
    OverdueFinePolicies.fillGeneralInformation(overduePolicyProps);
    OverdueFinePolicies.save();
    OverdueFinePolicies.verifyCreatedFines(overduePolicyProps);

    OverdueFinePolicies.openEditingForm();
    OverdueFinePolicies.checkEditingForm(overduePolicyProps);
    OverdueFinePolicies.fillGeneralInformation(editedOverduePolicyProps);
    OverdueFinePolicies.save();
    OverdueFinePolicies.verifyCreatedFines(editedOverduePolicyProps);

    OverdueFinePolicies.delete();
    OverdueFinePolicies.linkIsAbsent();
  });
});
