import { calloutTypes } from '../../../../interactors';
import { RECORD_STATUSES } from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventorySteps from '../../../support/fragments/inventory/inventorySteps';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

// TO DO: remove ignoring errors. Now when you click on one of the buttons, some promise in the application returns false
Cypress.on('uncaught:exception', () => false);

describe('MARC -> MARC Holdings', () => {
  const testData = {};
  const fileName = `testMarcFile.${getRandomPostfix()}.mrc`;
  const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
  let instanceID;

  before(() => {
    cy.createTempUser([
      permissions.inventoryAll.gui,
      permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
      permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;
    });

    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
      DataImport.uploadFile('oneMarcBib.mrc', fileName);
      JobProfiles.waitFileIsUploaded();
      JobProfiles.search(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileName);
      Logs.checkStatusOfJobProfile('Completed');
      Logs.openFileDetails(fileName);
      Logs.getCreatedItemsID(0).then((link) => {
        instanceID = link.split('/')[5];
      });
      Logs.goToTitleLink(RECORD_STATUSES.CREATED);
      cy.wait(2000);
      InventorySteps.addMarcHoldingRecord();
    });
  });

  beforeEach(() => {
    cy.login(testData.user.username, testData.user.password, {
      path: TopMenu.inventoryPath,
      waiter: InventorySearchAndFilter.waitLoading,
    });
    cy.wait(4000);
    InventorySearchAndFilter.searchInstanceByTitle(instanceID);
    InventorySearchAndFilter.selectViewHoldings();
    // TODO: Delete below two lines of code after Actions -> View source of Holding's view works as expected.
    HoldingsRecordView.close();
    InventoryInstance.openHoldingView();
    HoldingsRecordView.editInQuickMarc();
  });

  after(() => {
    cy.loginAsAdmin({ path: TopMenu.inventoryPath, waiter: InventorySearchAndFilter.waitLoading });
    InventorySearchAndFilter.searchInstanceByTitle(instanceID);
    InventorySearchAndFilter.selectViewHoldings();
    HoldingsRecordView.delete();
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    if (instanceID) InventoryInstance.deleteInstanceViaApi(instanceID);
  });

  it(
    'C345390 Add a field to a record using quickMARC (spitfire)',
    { tags: ['smoke', 'spitfire'] },
    () => {
      QuickMarcEditor.addRow(HoldingsRecordView.newHolding.rowsCountInQuickMarcEditor);
      QuickMarcEditor.checkInitialContent(
        HoldingsRecordView.newHolding.rowsCountInQuickMarcEditor + 1,
      );
      const expectedInSourceRow = QuickMarcEditor.fillAllAvailableValues(
        undefined,
        undefined,
        HoldingsRecordView.newHolding.rowsCountInQuickMarcEditor,
      );
      QuickMarcEditor.pressSaveAndClose();
      HoldingsRecordView.waitLoading();
      // TODO: Delete below two lines of code after Actions -> View source of Holding's view works as expected.
      HoldingsRecordView.close();
      InventoryInstance.openHoldingView();
      HoldingsRecordView.viewSource();
      InventoryViewSource.contains(expectedInSourceRow);
    },
  );

  it('C345398 Edit MARC 008 (spitfire)', { tags: ['smoke', 'spitfire'] }, () => {
    // Wait until the page to be loaded fully.
    cy.wait(1000);
    QuickMarcEditor.checkNotExpectedByteLabelsInTag008Holdings();

    const changed008TagValue = QuickMarcEditor.updateAllDefaultValuesIn008TagInHoldings();
    HoldingsRecordView.waitLoading();
    // TODO: Delete below two lines of code after Actions -> View source of Holding's view works as expected.
    HoldingsRecordView.close();
    InventoryInstance.openHoldingView();
    HoldingsRecordView.viewSource();
    InventoryViewSource.contains(changed008TagValue);
    InventoryViewSource.close();
    HoldingsRecordView.editInQuickMarc();
    QuickMarcEditor.waitLoading();

    const cleared008TagValue = QuickMarcEditor.clearTag008Holdings();
    HoldingsRecordView.waitLoading();
    HoldingsRecordView.viewSource();
    InventoryViewSource.contains(cleared008TagValue);
    InventoryViewSource.close();
    HoldingsRecordView.editInQuickMarc();
    QuickMarcEditor.waitLoading();
    QuickMarcEditor.checkReplacedVoidValuesInTag008Holdings();
  });

  it(
    'C345400 Attempt to save a record without a MARC 852 (spitfire)',
    { tags: ['smoke', 'spitfire'] },
    () => {
      QuickMarcEditor.getRegularTagContent('852').then((initialTagContent) => {
        QuickMarcEditor.deleteTag(5);
        QuickMarcEditor.pressSaveAndClose();
        InteractorsTools.checkCalloutMessage(
          'Record cannot be saved. An 852 is required.',
          calloutTypes.error,
        );
        QuickMarcEditor.closeWithoutSavingAfterChange();
        // TODO: Delete below four lines of code after Actions -> View source of Holding's view works as expected.
        HoldingsRecordView.close();
        InventoryInstance.openHoldingView();
        HoldingsRecordView.viewSource();
        InventoryViewSource.contains(QuickMarcEditor.getSourceContent(initialTagContent));
      });
    },
  );
});
