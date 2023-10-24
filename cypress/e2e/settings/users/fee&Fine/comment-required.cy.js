import { DevTeams, TestTypes } from '../../../../support/dictionary';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import CommentRequired from '../../../../support/fragments/settings/users/comment-required';
import InteractorsTools from '../../../../support/utils/interactorsTools';

describe('Settings Users', () => {
  const message = 'Comment required settings were successfully updated.';
  const yesOption = 'Yes';

  before('Create test data', () => {
    cy.getAdminToken();
    cy.loginAsAdmin({
      path: SettingsMenu.commentRequired,
      waiter: CommentRequired.waitLoading,
    });
  });

  after('Delete test data', () => {
    CommentRequired.turnOffCommentRequiredFlags();
  });

  it(
    'C448 Verify that you can turn on/turn off comment required flags (vega) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.vega] },
    () => {
      CommentRequired.verifySaveButtonDisabled();
      CommentRequired.verifyRequireCommentForPaidFeeOptions();
      CommentRequired.verifyrequireCommentForWaivedFeeOptions();
      CommentRequired.verifyRequireCommentForRefundedFeeOptions();
      CommentRequired.verifyRequireCommentForTransferredFeeOptions();
      CommentRequired.requireCommentForPaidFeeChooseOption(yesOption);
      CommentRequired.requireCommentForWaivedFeeChooseOption(yesOption);
      CommentRequired.requireCommentForRefundedFeeChooseOption(yesOption);
      CommentRequired.requireCommentForTransferredFeeChooseOption(yesOption);
      CommentRequired.clickSaveButton();
      InteractorsTools.checkCalloutMessage(message);
    },
  );
});
