import { Permissions } from '../../../support/dictionary';
import HridHandling from '../../../support/fragments/settings/inventory/instance-holdings-item/hridHandling';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';

describe('Inventory', () => {
  describe('Settings', () => {
    const testData = {};

    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.uiUsersView.gui,
        Permissions.uiSettingsHRIDHandlingCreateEditDelete.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;
        cy.login(testData.user.username, testData.user.password);
      });
    });

    after('Delete user', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
      });
    });

    // this test we can't run in parallel, so it is skipped and moved to manual
    it(
      'C369055 Verify created/updated by widget on HRID Settings page (folijet) (TaaS)',
      { tags: ['extendedPathBroken', 'folijet', 'C369055'] },
      () => {
        cy.visit(SettingsMenu.hridHandlingPath);
        HridHandling.waitloading();
        HridHandling.recordLastUpdatedAccourdionLabelValueCorrect();
        HridHandling.clickRecordLastUpdatedAccordion();
        HridHandling.verifyValueInRecordDetailsSection('Unknown user');
        // wait, because next steps can be failed without it
        cy.wait(2000);
        // uncheck first, since this checkbox can be checked by default
        HridHandling.uncheckRemoveLeadingZeroesIfCheckedAndSave();
        HridHandling.checkRemoveLeadingZeroesAndSave();

        let date = DateTools.getFormattedDateWithTime(new Date(), { withSpace: true });
        // wait, because next steps can be failed without it
        cy.wait(5000);
        HridHandling.verifyValueInRecordDetailsSection(testData.user.username);
        HridHandling.verifyValueInRecordDetailsSection(date);
        HridHandling.uncheckRemoveLeadingZeroesAndSave();

        date = DateTools.getFormattedDateWithTime(new Date(), { withSpace: true });
        HridHandling.verifyValueInRecordDetailsSection(testData.user.username);
        HridHandling.verifyValueInRecordDetailsSection(date);
      },
    );
  });
});
