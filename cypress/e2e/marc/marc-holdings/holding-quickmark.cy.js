import { calloutTypes } from '../../../../interactors';
import { DEFAULT_JOB_PROFILE_NAMES, RECORD_STATUSES } from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
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

describe('MARC', () => {
  describe('MARC Holdings', () => {
    const testData = {};
    const fileName = `testMarcFile.${getRandomPostfix()}.mrc`;
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    const propertyName = 'instance';
    let instanceID;

    before(() => {
      cy.getAdminToken();
      cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
        permissions.moduleDataImportEnabled.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
          authRefresh: true,
        }).then(() => {
          cy.getUserToken(testData.user.username, testData.user.password);
          DataImport.uploadFileViaApi('oneMarcBib.mrc', fileName, jobProfileToRun).then(
            (response) => {
              response.forEach((record) => {
                instanceID = record[propertyName].id;
              });
            },
          );
          Logs.waitFileIsImported(fileName);
          Logs.checkJobStatus(fileName, 'Completed');
          Logs.openFileDetails(fileName);
          Logs.goToTitleLink(RECORD_STATUSES.CREATED);
          InventorySteps.addMarcHoldingRecord();
        });
      });
    });

    beforeEach(() => {
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventorySearchAndFilter.waitLoading,
        authRefresh: true,
      });
      InventorySearchAndFilter.searchInstanceByTitle(instanceID);
      InventorySearchAndFilter.selectViewHoldings();
      HoldingsRecordView.editInQuickMarc();
      QuickMarcEditor.waitLoading();
    });

    after(() => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      if (instanceID) InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceID);
    });

    it(
      'C345390 Add a field to a record using quickMARC (spitfire)',
      { tags: ['smoke', 'spitfire', 'shiftLeftBroken', 'C345390'] },
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
        HoldingsRecordView.viewSource();
        InventoryViewSource.contains(expectedInSourceRow);
      },
    );

    it(
      'C345398 Edit MARC 008 (spitfire)',
      { tags: ['smoke', 'spitfire', 'shiftLeftBroken', 'C345398'] },
      () => {
        QuickMarcEditor.checkNotExpectedByteLabelsInTag008Holdings();

        const changed008TagValue = QuickMarcEditor.updateAllDefaultValuesIn008TagInHoldings();
        HoldingsRecordView.waitLoading();
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
      },
    );

    it(
      'C345400 Attempt to save a record without a MARC 852 (spitfire)',
      { tags: ['smoke', 'spitfire', 'shiftLeftBroken', 'C345400'] },
      () => {
        QuickMarcEditor.getRegularTagContent('852').then((initialTagContent) => {
          QuickMarcEditor.deleteTag(5);
          QuickMarcEditor.pressSaveAndCloseButton();
          InteractorsTools.checkCalloutMessage(
            'Record cannot be saved. An 852 is required.',
            calloutTypes.error,
          );
          QuickMarcEditor.verifyValidationCallout(0, 1);
          QuickMarcEditor.pressCancel();
          QuickMarcEditor.closeWithoutSavingInEditConformation();
          HoldingsRecordView.viewSource();
          InventoryViewSource.contains(QuickMarcEditor.getSourceContent(initialTagContent));
        });
      },
    );
  });
});
