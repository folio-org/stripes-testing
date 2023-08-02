import TopMenu from '../../../support/fragments/topMenu';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import TestTypes from '../../../support/dictionary/testTypes';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import DevTeams from '../../../support/dictionary/devTeams';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../support/fragments/users/users';
import Permissions from '../../../support/dictionary/permissions';

describe('MARC -> MARC Holdings', () => {
  const testData = {
    tag001: '001',
    tag001value: '$a Second 001 field'
  };

  const marcFile = {
    marc: 'marcBibFileC387461.mrc',
    fileName: `testMarcFile.C387461.${getRandomPostfix()}.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    numOfRecords: 1,
  };

  const recordIDs = [];

  before('Creating user, data', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
      Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
    ]).then(createdUserProperties => {
      testData.createdUserProperties = createdUserProperties;

      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        DataImport.uploadFile(marcFile.marc, marcFile.fileName);
        JobProfiles.waitLoadingList();
        JobProfiles.searchJobProfileForImport(marcFile.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFile.fileName);
        Logs.checkStatusOfJobProfile('Completed');
        Logs.openFileDetails(marcFile.fileName);
        Logs.getCreatedItemsID().then(link => {
          recordIDs.push(link.split('/')[5]);
          cy.visit(TopMenu.inventoryPath).then(() => {
            InventoryInstance.searchByTitle(recordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.goToMarcHoldingRecordAdding();
            QuickMarcEditor.updateExistingField('852', QuickMarcEditor.getExistingLocation());
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveHoldings();

            HoldingsRecordView.getHoldingsIDInDetailView().then((holdingsID) => {
              recordIDs.push(holdingsID);
            });
          });
        });
        cy.login(createdUserProperties.username, createdUserProperties.password, { path: TopMenu.inventoryPath, waiter: InventoryInstances.waitContentLoading });
      });
    });
  });

  after('Deleting created user, data', () => {
    Users.deleteViaApi(testData.createdUserProperties.userId);
    cy.deleteHoldingRecordViaApi(recordIDs[1]);
    InventoryInstance.deleteInstanceViaApi(recordIDs[0]);
    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    DataImport.selectLog();
    DataImport.openDeleteImportLogsModal();
    DataImport.confirmDeleteImportLogs();
  });

  it('C387461 Add multiple 001s when editing "MARC Holdings" record', { tags: [TestTypes.criticalPath, DevTeams.spitfire] }, () => {
    InventoryInstances.searchBySource('MARC');
    InventoryInstance.searchByTitle(recordIDs[0]);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldingView();
    HoldingsRecordView.checkSource('MARC');
    // "Edit in quickMARC" option might not be active immediately when opening MARC Holdings
    // this option becomes active after reopening Holdings view window
    HoldingsRecordView.close();
    InventoryInstance.openHoldingView();
    HoldingsRecordView.editInQuickMarc();
    QuickMarcEditor.addEmptyFields(5);
    QuickMarcEditor.checkEmptyFieldAdded(6);
    QuickMarcEditor.updateExistingField('', testData.tag001value);
    QuickMarcEditor.updateTagNameToLockedTag(6, '001');
    QuickMarcEditor.checkFourthBoxDisabled(6);
    QuickMarcEditor.pressSaveAndClose();
    QuickMarcEditor.checkAfterSaveHoldings();
    HoldingsRecordView.editInQuickMarc();
    QuickMarcEditor.checkReadOnlyTags();
    QuickMarcEditor.verifyNoFieldWithContent(testData.tag001value);
  });
});
