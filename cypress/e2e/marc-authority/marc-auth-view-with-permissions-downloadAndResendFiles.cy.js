import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import DateTools from '../../support/utils/dateTools';

describe('MARC -> MARC Authority', () => {
  const testData = {};

  before('Creating user', () => {
    cy.createTempUser([
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      Permissions.inventoryAll.gui,
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiInventoryViewCreateEditInstances.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.exportManagerAll.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.marcAuthorities,
        waiter: MarcAuthorities.waitLoading,
      });
    });
  });

  after('Deleting user', () => {
    Users.deleteViaApi(testData.userProperties.userId);
  });

  it(
    'C375135 User with "Export manager: Download and re-send files" permission can view report options for "MARC authority" records (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      const today = DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY');
      const tomorrow = DateTools.getTomorrowDayDateForFiscalYear();
      MarcAuthorities.clickActionsAndReportsButtons();
      MarcAuthorities.fillReportModal(today, tomorrow);
      MarcAuthorities.clickExportButton();

      cy.intercept('POST', '/data-export-spring/jobs').as('getId');
      cy.wait('@getId', { timeout: 10000 }).then((item) => {
        MarcAuthorities.checkCalloutAfterExport(item.response.body.name);
      });
    },
  );
});
