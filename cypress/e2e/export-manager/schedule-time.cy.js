import { Permissions } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import TransferFeeFine from '../../support/fragments/users/transferFeeFine';
import Users from '../../support/fragments/users/users';

describe('Export Manager', () => {
  let user;

  before('Create test data', () => {
    cy.createTempUser([
      Permissions.exportManagerAll.gui,
      Permissions.transferExports.gui,
      Permissions.settingsUsersCRUD.gui,
      Permissions.uiUserAccounts.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.transferCriteriaPath,
        waiter: TransferFeeFine.waitLoadingTransferCriteria,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(user.userId);
    });
  });

  it(
    'C350699 Verify the schedule time -- AM/PM format (helios)',
    { tags: ['extendedPath', 'helios', 'C350699'] },
    () => {
      TransferFeeFine.selectTransferCriteriaSchedulePeriod('Days');

      const hourAM = '9';
      const minuteAM = '45';
      const timeAM = `${hourAM}:${minuteAM} AM`;

      TransferFeeFine.openTimePicker();
      TransferFeeFine.typeScheduleTime(hourAM, minuteAM, 'AM');
      TransferFeeFine.verifyScheduleTime(timeAM);

      const hourPM = '6';
      const minutePM = '20';
      const timePM = `${hourPM}:${minutePM} PM`;

      TransferFeeFine.openTimePicker();
      TransferFeeFine.typeScheduleTime(hourPM, minutePM, 'PM');
      TransferFeeFine.verifyScheduleTime(timePM);
    },
  );
});
