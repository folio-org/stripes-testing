import settingsMenu from '../../support/fragments/settingsMenu';
import TransferFeeFine from '../../support/fragments/users/transferFeeFine';

describe('Export Manager', () => {
  before(() => {
    cy.loginAsAdmin({
      path: settingsMenu.usersTransferCriteria,
      waiter: TransferFeeFine.waitLoadingTransferCriteria,
    });
  });

  it(
    'C350699 Verify the schedule time -- AM/PM format (firebird)',
    { tags: ['extendedPathBama', 'bama'] },
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
