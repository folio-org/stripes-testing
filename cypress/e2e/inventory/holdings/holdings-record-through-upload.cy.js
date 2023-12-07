/// <reference types="cypress" />
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import features from '../../../support/dictionary/features';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryNewHoldings from '../../../support/fragments/inventory/inventoryNewHoldings';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';

describe('Manage holding records of instance records created through marc file upload', () => {
  const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
  const fileName = `testMarcFile.${getRandomPostfix()}.mrc`;
  let instanceId;
  before(() => {
    cy.loginAsAdmin();
    // required with special tests, but when step into test I see 403 some time in /metadata-provider/jobExecutions request
    cy.getAdminToken();
    cy.visit(TopMenu.dataImportPath);
    DataImport.verifyUploadState();
    DataImport.uploadFileAndRetry('oneMarcBib.mrc', fileName);
    JobProfiles.waitLoadingList();
    JobProfiles.search(jobProfileToRun);
    JobProfiles.runImportFile();
    JobProfiles.waitFileIsImported(fileName);
    Logs.checkStatusOfJobProfile('Completed');
    Logs.openFileDetails(fileName);
    Logs.getCreatedItemsID(0).then((link) => {
      instanceId = link.split('/')[5];
    });
  });

  after('Deleting data', () => {
    // InventoryInstance.deleteInstanceViaApi(instanceId[0]);
  });

  it(
    'C345408 MARC instance record + FOLIO holdings record (Regression) (spitfire)',
    { tags: ['smoke', 'spitfire', features.holdingsRecord, 'broken'] },
    () => {
      cy.visit(TopMenu.inventoryPath);
      InventoryInstance.searchByTitle(instanceId);
      InventoryInstances.selectInstance();
      InventoryInstance.waitLoading();
      InventoryInstance.createHoldingsRecord('Migration (Migration) ');
      InventoryInstance.openHoldingView();
      HoldingsRecordView.checkSource('FOLIO');
      HoldingsRecordView.checkActionsMenuOptionsInFolioSource();
      HoldingsRecordView.edit();
      HoldingsRecordEdit.waitLoading();
      HoldingsRecordEdit.checkReadOnlyFields();
      HoldingsRecordEdit.closeWithoutSave();
      InventoryInstance.openHoldingView();
      HoldingsRecordView.checkReadOnlyFields();
      HoldingsRecordView.tryToDelete();
      HoldingsRecordView.duplicate();
      InventoryNewHoldings.checkSource();
      // TODO: clarify what is "Verify that you are able to add or access an item" and "Behavior is no different than what FOLIO currently supports" in TestRail
    },
  );
});
