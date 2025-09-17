import { NOTICE_CATEGORIES } from '../../../../support/fragments/settings/circulation/patron-notices/noticePolicies';
import NoticeTemplates from '../../../../support/fragments/settings/circulation/patron-notices/noticeTemplates';
import ManualCharges from '../../../../support/fragments/settings/users/manualCharges';
import UsersOwners from '../../../../support/fragments/settings/users/usersOwners';
import SettingsMenu from '../../../../support/fragments/settingsMenu';

describe('Fees&Fines', () => {
  describe('Settings Users (Fee/fine)', () => {
    const owners = [UsersOwners.getDefaultNewOwner(), UsersOwners.getDefaultNewOwner()];
    const templates = [
      NoticeTemplates.getDefaultTemplate({ category: NOTICE_CATEGORIES.FeeFineCharge.id }),
      NoticeTemplates.getDefaultTemplate({ category: NOTICE_CATEGORIES.FeeFineAction.id }),
    ];
    const manualCharge = ManualCharges.getManualCharge({
      owner: owners[0],
    });

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        owners.forEach((owner) => UsersOwners.createViaApi(owner));
        templates.forEach((template) => NoticeTemplates.createViaApi(template));
      });

      cy.loginAsAdmin({
        path: SettingsMenu.manualCharges,
        waiter: ManualCharges.waitLoading,
        authRefresh: true,
      });
    });

    after('Delete test data', () => {
      /* delete all test objects created in precondition if possible */
      templates.forEach(({ id }) => {
        NoticeTemplates.deleteViaApi(id);
      });
      owners.forEach(({ id }) => {
        UsersOwners.deleteViaApi(id);
      });
    });

    it(
      'C444 Verify that you can copy manual charges of another fee/fine owner (vega) (TaaS)',
      { tags: ['extendedPath', 'vega', 'C444'] },
      () => {
        // add manual charges to first owner
        ManualCharges.selectOwner(owners[0]);
        ManualCharges.createViaUi(manualCharge);
        manualCharge.amount = '$10.00';
        ManualCharges.checkResultsTableContent([manualCharge]);

        // validate copy dialog for second owner
        ManualCharges.selectOwner(owners[1]);
        ManualCharges.copyExistingFeeFineDialog('No', owners[0].owner, 'Continue');
        ManualCharges.checkEmptyTableContent('There are no Fee/fine: Manual charges');
        ManualCharges.selectOwner(owners[0]);

        // copy manual charges from first owner and clean second owner
        ManualCharges.selectOwner(owners[1]);
        ManualCharges.copyExistingFeeFineDialog('Yes', owners[0].owner, 'Continue');
        ManualCharges.checkResultsTableContent([manualCharge]);
        ManualCharges.deleteViaUi(manualCharge);

        // remove manual charged from first owner
        ManualCharges.selectOwner(owners[0]);
        ManualCharges.deleteViaUi(manualCharge);
      },
    );
  });
});
