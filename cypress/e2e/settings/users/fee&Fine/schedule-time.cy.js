import TestTypes from '../../../../support/dictionary/testTypes';
import DevTeams from '../../../../support/dictionary/devTeams';
import settingsMenu from '../../../../support/fragments/settingsMenu';
import TransferFeeFine from '../../../../support/fragments/users/transferFeeFine';

describe('Settings (Users): verifying time picker', () => {
  before(() => {
    cy.loginAsAdmin({
      path: settingsMenu.usersTransferCriteria,
      waiter: TransferFeeFine.waitLoadingTransferCriteria,
    });
  });

  it(
    'C350699 Verify the schedule time -- AM/PM format (firebird)',
    { tags: [TestTypes.extendedPath, DevTeams.firebird] },
    () => {
      TransferFeeFine.selectTransferCriteriaSchedulePeriod('Days');

      const amTime = '9:15 AM';
      TransferFeeFine.typeScheduleTime(amTime);
      TransferFeeFine.verifyScheduleTime(amTime);

      const pmTime = '6:20 PM';
      TransferFeeFine.typeScheduleTime(pmTime);
      TransferFeeFine.verifyScheduleTime(pmTime);
    },
  );
});
