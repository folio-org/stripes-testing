import { DevTeams, TestTypes, Permissions } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import DateTools from '../../support/utils/dateTools';

describe('MARC Authority -> Reporting | MARC authority', () => {
  let userData;

  before('Creating test data', () => {
    cy.createTempUser([
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
      Permissions.exportManagerDownloadAndResendFiles.gui,
    ]).then((userProperties) => {
      userData = userProperties;

      cy.login(userData.username, userData.password, {
        path: TopMenu.marcAuthorities,
        waiter: MarcAuthorities.waitLoading,
      });
    });
  });

  after('Deleting test data', () => {
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C375218 Date input via date pickers in "Set date range for MARC authority headings updates (CSV) report" modal (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      const yesterday = DateTools.getPreviousDayDate();
      const today = DateTools.getCurrentDate();
      const tomorrow = DateTools.getTomorrowDayDateForFiscalYear();

      MarcAuthorities.clickActionsAndReportsButtons();
      MarcAuthorities.fillReportModal('', tomorrow);
      MarcAuthorities.checkValidationError({ name: 'fromDate', error: '"Start date" is required' });

      MarcAuthorities.fillReportModal(today, '');
      MarcAuthorities.checkValidationError({ name: 'toDate', error: '"End date" is required' });

      MarcAuthorities.fillReportModal(today, yesterday);
      MarcAuthorities.checkValidationError({
        name: 'toDate',
        error: '"End date" must be greater than or equal to "Start date"',
      });

      MarcAuthorities.clickClearFieldIcon({ name: 'fromDate' });
      MarcAuthorities.checkValidationError({ name: 'fromDate', error: '"Start date" is required' });

      MarcAuthorities.clickClearFieldIcon({ name: 'toDate' });
      MarcAuthorities.checkValidationError({ name: 'toDate', error: '"End date" is required' });

      MarcAuthorities.fillReportModal(tomorrow, yesterday);
      MarcAuthorities.checkValidationError({
        name: 'toDate',
        error: '"End date" must be greater than or equal to "Start date"',
      });

      MarcAuthorities.fillReportModal(today, tomorrow);
      MarcAuthorities.checkNoValidationErrors();
    },
  );
});
