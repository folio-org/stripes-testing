import { DevTeams, TestTypes } from '../../../../support/dictionary';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import ManualCharges from '../../../../support/fragments/settings/users/manualCharges';
import UsersOwners from '../../../../support/fragments/settings/users/usersOwners';
import { NOTICE_CATEGORIES } from '../../../../support/fragments/settings/circulation/patron-notices/noticePolicies';
import NoticeTemplates from '../../../../support/fragments/settings/circulation/patron-notices/noticeTemplates';

describe('Users: Manual charges', () => {
  const owners = [UsersOwners.getDefaultNewOwner(), UsersOwners.getDefaultNewOwner()];
  const templates = [
    NoticeTemplates.getDefaultTemplate({ category: NOTICE_CATEGORIES.FeeFineCharge }),
    NoticeTemplates.getDefaultTemplate({ category: NOTICE_CATEGORIES.FeeFineAction }),
  ];
  const manualCharge = ManualCharges.getManualCharge({
    owner: owners[0],
    chargeNoticeId: templates[0].name,
    actionNoticeId: templates[1].name,
  });

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      owners.forEach((owner) => UsersOwners.createViaApi(owner));
      templates.forEach((template) => NoticeTemplates.createViaApi(template));
    });

    cy.loginAsAdmin({
      path: SettingsMenu.manualCharges,
      waiter: ManualCharges.waitLoading,
    });
  });

  after('Delete test data', () => {
    templates.forEach(({ id }) => {
      NoticeTemplates.deleteViaApi(id);
    });
    owners.forEach(({ id }) => {
      UsersOwners.deleteViaApi(id);
    });
  });

  it(
    'C442 Verify that you can create/edit/delete manual charges for a fee/fine owner (vega) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.vega] },
    () => {
      ManualCharges.selectOwner(owners[0]);
      ManualCharges.createViaUi(manualCharge);
      ManualCharges.checkResultsTableContent([manualCharge]);

      ManualCharges.createViaUi(manualCharge);
      ManualCharges.checkValidatorError({ error: 'Fee/fine type already exists' });
      ManualCharges.clickCancelBtn();

      const editedManualCharge = {
        ...manualCharge,
        feeFineType: `Edited: ${manualCharge.feeFineType}`,
        amount: '100.00',
      };
      ManualCharges.editViaUi(manualCharge, editedManualCharge);
      ManualCharges.checkResultsTableContent([editedManualCharge]);

      ManualCharges.deleteViaUi(editedManualCharge);
    },
  );
});
