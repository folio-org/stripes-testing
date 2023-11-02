import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import DateTools from '../../../support/utils/dateTools';

describe('MARC Authority -> Reporting | MARC authority', () => {
  let userData;

  const yesterday = DateTools.getPreviousDayDate();
  const today = DateTools.getCurrentDate();
  const tomorrow = DateTools.getTomorrowDayDateForFiscalYear();

  beforeEach('Creating user', () => {
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

  afterEach('Deleting user', () => {
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C375218 Date input via date pickers in "Set date range for MARC authority headings updates (CSV) report" modal (spitfire) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
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

  it(
    'C376606 Manual date input in "Set date range for MARC authority headings updates (CSV) report" modal (spitfire)',
    { tags: [TestTypes.smoke, DevTeams.spitfire] },
    () => {
      MarcAuthorities.clickActionsAndReportsButtons();
      MarcAuthorities.fillReportModal(today, '');
      MarcAuthorities.checkValidationError({ name: 'toDate', error: '"End date" is required' });

      MarcAuthorities.fillReportModal(tomorrow, today);
      MarcAuthorities.checkValidationError({
        name: 'toDate',
        error: '"End date" must be greater than or equal to "Start date"',
      });

      MarcAuthorities.fillReportModal('13/02/2023', '13/02/2023');
      MarcAuthorities.checkValidationError({ name: 'fromDate', error: '"Start date" is required' });
      MarcAuthorities.checkValidationError({ name: 'toDate', error: '"End date" is required' });

      MarcAuthorities.fillReportModal(today, tomorrow);
      MarcAuthorities.checkNoValidationErrors();
      MarcAuthorities.clickCancelButtonOfReportModal();

      MarcAuthorities.clickHeadingsUpdatesButton();
      MarcAuthorities.fillReportModal('03/02/202', '03/32/2023');
      MarcAuthorities.checkValidationError({ name: 'fromDate', error: '"Start date" is required' });
      MarcAuthorities.checkValidationError({ name: 'toDate', error: '"End date" is required' });

      MarcAuthorities.fillReportModal(today, tomorrow);
      MarcAuthorities.checkNoValidationErrors();
      MarcAuthorities.closeAuthReportModalUsingESC();

      MarcAuthorities.clickHeadingsUpdatesButton();
      MarcAuthorities.fillReportModal('03/02/202', '03/32/2023');
      MarcAuthorities.checkValidationError({ name: 'fromDate', error: '"Start date" is required' });
      MarcAuthorities.checkValidationError({ name: 'toDate', error: '"End date" is required' });

      MarcAuthorities.fillReportModal('test', 'test');
      MarcAuthorities.checkValidationError({ name: 'fromDate', error: '"Start date" is required' });
      MarcAuthorities.checkValidationError({ name: 'toDate', error: '"End date" is required' });

      MarcAuthorities.fillReportModal(today, tomorrow);
      MarcAuthorities.checkNoValidationErrors();

      MarcAuthorities.fillReportModal('', '');
      MarcAuthorities.checkValidationError({ name: 'fromDate', error: '"Start date" is required' });
      MarcAuthorities.checkValidationError({ name: 'toDate', error: '"End date" is required' });

      MarcAuthorities.fillReportModal(today, tomorrow);
      MarcAuthorities.checkNoValidationErrors();
    },
  );
});
