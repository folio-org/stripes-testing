import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../../support/fragments/data_import/dataImport';

describe('plug-in MARC authority | Search', () => {
    const testData = {};
    let instanceID;

  before('Creating user', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then(createdUserProperties => {
      testData.userProperties = createdUserProperties;

      cy.loginAsAdmin();
      DataImport.uploadMarcBib();
    });
  });

  beforeEach('Login to the application', () => {
    cy.login(testData.userProperties.username, testData.userProperties.password, { path: TopMenu.inventoryPath, waiter: InventoryInstances.waitContentLoading });
  });

  after('Deleting created user', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(instanceID);

    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    DataImport.selectLog();
    DataImport.openDeleteImportLogsModal();
    DataImport.confirmDeleteImportLogs();
  });

  it('C359015 MARC Authority plug-in | Search for MARC authority records when the user clicks on the "Link" icon (spitfire)', { tags: [TestTypes.smoke, DevTeams.spitfire] }, () => {
    InventoryInstance.searchByTitle('Anglo-Saxon manuscripts');
    InventoryInstances.selectInstance();
    InventoryInstance.getId().then(id => { instanceID = id; });
    InventoryInstance.editMarcBibliographicRecord();
    InventoryInstance.verifyAndClickLinkIcon('700');
    InventoryInstance.verifySelectMarcAuthorityModal();
    InventoryInstance.verifySearchAndFilterDisplay();
    InventoryInstance.closeAuthoritySource();
    InventoryInstance.verifySearchOptions();
    InventoryInstance.fillInAndSearchResults('Starr, Lisa');
    InventoryInstance.checkResultsListPaneHeader();
    InventoryInstance.checkSearchResultsTable();
    InventoryInstance.selectRecord();
    InventoryInstance.checkRecordDetailPage();
    InventoryInstance.closeDetailsView();
    InventoryInstance.closeFindAuthorityModal();
  });
});