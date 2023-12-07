import TopMenu from '../../support/fragments/topMenu';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InteractorsTools from '../../support/utils/interactorsTools';
import InventorySteps from '../../support/fragments/inventory/inventorySteps';
import HoldingsRecordView from '../../support/fragments/inventory/holdingsRecordView';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';
import Features from '../../support/dictionary/features';
import permissions from '../../support/dictionary/permissions';
import getRandomPostfix from '../../support/utils/stringTools';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstancesMovement from '../../support/fragments/inventory/holdingsMove/inventoryInstancesMovement';
import users from '../../support/fragments/users/users';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import { ITEM_STATUS_NAMES } from '../../support/constants';
import DataImport from '../../support/fragments/data_import/dataImport';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';

describe('ui-inventory: moving items', { retries: 2 }, () => {
  const successCalloutMessage = '1 item has been successfully moved.';
  let userId;
  let firstHolding = '';
  let secondHolding = '';
  let ITEM_BARCODE;
  const marcInstanceIDs = [];

  const marcFiles = [
    {
      marc: 'marcFileOCLC.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
    {
      marc: 'marcFileOCLC.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
  ];

  before(() => {
    marcFiles.forEach((marcFile) => {
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
        JobProfiles.waitLoadingList();
        JobProfiles.search(marcFile.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFile.fileName);
        Logs.checkStatusOfJobProfile('Completed');
        Logs.openFileDetails(marcFile.fileName);
        Logs.getCreatedItemsID().then((link) => {
          marcInstanceIDs.push(link.split('/')[5]);
        });
      });
    });
  });

  beforeEach('navigates to Inventory', () => {
    let source;

    ITEM_BARCODE = `test${getRandomPostfix()}`;
    cy.createTempUser([
      permissions.inventoryAll.gui,
      permissions.uiInventoryMoveItems.gui,
      permissions.uiInventorySingleRecordImport.gui,
      permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
      permissions.uiInventoryHoldingsMove.gui,
      permissions.uiQuickMarcQuickMarcHoldingsEditorView.gui,
      permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      permissions.converterStorageAll.gui,
    ]).then((userProperties) => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password);
      cy.visit(TopMenu.inventoryPath);
      cy.getAdminToken()
        .then(() => {
          cy.getLoanTypes({ limit: 1 });
          cy.getMaterialTypes({ limit: 1 });
          cy.getLocations({ limit: 2 });
          cy.getHoldingTypes({ limit: 2 });
          InventoryHoldings.getHoldingSources({ limit: 2 }).then((holdingsSources) => {
            source = holdingsSources;
          });
          cy.getInstanceTypes({ limit: 1 });
          ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' });
          cy.getUsers({
            limit: 1,
            query: `"personal.lastName"="${userProperties.username}" and "active"="true"`,
          });
        })
        .then(() => {
          firstHolding = Cypress.env('locations')[0].name;
          secondHolding = Cypress.env('locations')[1].name;
          cy.createInstance({
            instance: {
              instanceTypeId: Cypress.env('instanceTypes')[0].id,
              title: `Barcode search test ${Number(new Date())}`,
            },
            holdings: [
              {
                holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
                permanentLocationId: Cypress.env('locations')[0].id,
                sourceId: source[0].id,
              },
              {
                holdingsTypeId: Cypress.env('holdingsTypes')[1].id,
                permanentLocationId: Cypress.env('locations')[1].id,
                sourceId: source[1].id,
              },
            ],
            items: [
              [
                {
                  barcode: ITEM_BARCODE,
                  missingPieces: '3',
                  numberOfMissingPieces: '3',
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
                  materialType: { id: Cypress.env('materialTypes')[0].id },
                },
              ],
            ],
          });
        });
    });
  });

  after('Delete all data', () => {
    cy.getAdminToken();
    cy.getInstance({ limit: 1, expandAll: true, query: `"items.barcode"=="${ITEM_BARCODE}"` }).then(
      (instance) => {
        cy.deleteItemViaApi(instance.items[0].id);
        cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        cy.deleteHoldingRecordViaApi(instance.holdings[1].id);
        InventoryInstance.deleteInstanceViaApi(instance.id);
      },
    );
    users.deleteViaApi(userId);
  });

  it(
    'C15185 Move multiple items from one holdings to another holdings within an instance (firebird)',
    { tags: ['smoke', 'firebird'] },
    () => {
      InventorySearchAndFilter.switchToItem();
      cy.wait(3000);
      InventorySearchAndFilter.searchByParameter('Barcode', ITEM_BARCODE);
      InventorySearchAndFilter.selectSearchResultItem();
      ItemRecordView.closeDetailView();
      InventoryInstance.openMoveItemsWithinAnInstance();

      InventoryInstance.openHoldings([secondHolding]);
      InventoryInstance.moveItemToAnotherHolding({
        fromHolding: firstHolding,
        toHolding: secondHolding,
      });
      InteractorsTools.checkCalloutMessage(successCalloutMessage);

      InventoryInstance.openHoldings([firstHolding]);
      InventoryInstance.returnItemToFirstHolding(firstHolding, secondHolding);
      InteractorsTools.checkCalloutMessage(successCalloutMessage);
    },
  );

  it(
    'C345404 Move holdings record with Source = MARC to an instance record with source = MARC (spitfire)',
    { tags: ['smoke', 'spitfire', Features.eHoldings] },
    () => {
      InventorySearchAndFilter.searchInstanceByTitle(marcInstanceIDs[0]);
      InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
        // additional instance record which will linked with holdings record initially
        InventorySearchAndFilter.searchInstanceByTitle(marcInstanceIDs[1]);
        InventoryInstance.checkUpdatedHRID(initialInstanceHrId);
        // TODO: redesign to api step
        InventorySteps.addMarcHoldingRecord();
        HoldingsRecordView.getHoldingsHrId().then((holdingsRecordhrId) => {
          HoldingsRecordView.close();
          InventoryInstance.waitLoading();
          InventoryInstance.moveHoldingsToAnotherInstance(initialInstanceHrId);
          InventoryInstancesMovement.closeInLeftForm();
          InventorySearchAndFilter.searchByParameter('Instance HRID', initialInstanceHrId);
          InventoryInstances.waitLoading();
          InventoryInstances.selectInstance();
          InventoryInstance.openHoldingView();
          HoldingsRecordView.checkHrId(holdingsRecordhrId);
          // TODO: Delete below two lines of code after Actions -> View source of Holding's view works as expected.
          HoldingsRecordView.close();
          // wait for holdings data to be updated
          cy.wait(2000);
          InventoryInstance.openHoldingView();
          HoldingsRecordView.viewSource();
          InventoryViewSource.contains(`004\t${initialInstanceHrId}`);
        });
      });
    },
  );
});
