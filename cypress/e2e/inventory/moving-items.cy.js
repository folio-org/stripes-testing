import TopMenu from '../../support/fragments/topMenu';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import TestTypes from '../../support/dictionary/testTypes';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InteractorsTools from '../../support/utils/interactorsTools';
import InventoryActions from '../../support/fragments/inventory/inventoryActions';
import InventorySteps from '../../support/fragments/inventory/inventorySteps';
import HoldingsRecordView from '../../support/fragments/inventory/holdingsRecordView';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';
import Features from '../../support/dictionary/features';
import permissions from '../../support/dictionary/permissions';
import getRandomPostfix from '../../support/utils/stringTools';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import devTeams from '../../support/dictionary/devTeams';
import InventoryInstancesMovement from '../../support/fragments/inventory/holdingsMove/inventoryInstancesMovement';
import users from '../../support/fragments/users/users';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import Z3950TargetProfiles from '../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import { ITEM_STATUS_NAMES } from '../../support/constants';

describe('ui-inventory: moving items', { retries: 2 }, () => {
  const successCalloutMessage = '1 item has been successfully moved.';
  let userId;
  let firstHolding = '';
  let secondHolding = '';
  let ITEM_BARCODE;

  before(() => {
    cy.getAdminToken().then(() => {
      Z3950TargetProfiles.changeOclcWorldCatValueViaApi('100473910/PAOLF');
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
    ])
      .then(userProperties => {
        userId = userProperties.userId;
        cy.login(userProperties.username, userProperties.password);
        cy.visit(TopMenu.inventoryPath);
        cy.getAdminToken()
          .then(() => {
            cy.getLoanTypes({ limit: 1 });
            cy.getMaterialTypes({ limit: 1 });
            cy.getLocations({ limit: 2 });
            cy.getHoldingTypes({ limit: 2 });
            InventoryHoldings.getHoldingSources({ limit: 2 })
              .then(holdingsSources => {
                source = holdingsSources;
              });
            cy.getInstanceTypes({ limit: 1 });
            ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' });
            cy.getUsers({
              limit: 1,
              query: `"personal.lastName"="${userProperties.username}" and "active"="true"`
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
                }],
              items: [
                [{
                  barcode: ITEM_BARCODE,
                  missingPieces: '3',
                  numberOfMissingPieces: '3',
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
                  materialType: { id: Cypress.env('materialTypes')[0].id },
                }],
              ],
            });
          });
      });
  });

  after('Delete all data', () => {
    cy.getInstance({ limit: 1, expandAll: true, query: `"items.barcode"=="${ITEM_BARCODE}"` })
      .then((instance) => {
        cy.deleteItemViaApi(instance.items[0].id);
        cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        cy.deleteHoldingRecordViaApi(instance.holdings[1].id);
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
    users.deleteViaApi(userId);
  });


  it('C15185 Move multiple items from one holdings to another holdings within an instance (firebird)', { tags: [TestTypes.smoke, devTeams.firebird] }, () => {
    InventorySearchAndFilter.switchToItem();
    InventorySearchAndFilter.searchByParameter('Barcode', ITEM_BARCODE);
    InventorySearchAndFilter.selectSearchResultItem();
    ItemRecordView.closeDetailView();
    InventoryInstance.openMoveItemsWithinAnInstance();

    InventoryInstance.moveItemToAnotherHolding(firstHolding, secondHolding);
    InteractorsTools.checkCalloutMessage(successCalloutMessage);

    InventoryInstance.returnItemToFirstHolding(firstHolding, secondHolding);
    InteractorsTools.checkCalloutMessage(successCalloutMessage);
  });

  it('C345404 Move holdings record with Source = MARC to an instance record with source = MARC (spitfire)', { tags: [TestTypes.smoke, devTeams.spitfire, Features.eHoldings] }, () => {
    InventoryActions.import();
    InventoryInstance.getAssignedHRID().then(initialInstanceHrId => {
      // additional instance record which will linked with holdings record initially
      InventoryActions.import();
      // TODO: redesign to api step
      InventorySteps.addMarcHoldingRecord();
      HoldingsRecordView.getHoldingsHrId().then(holdingsRecordhrId => {
        HoldingsRecordView.close();
        InventoryInstance.waitLoading();
        InventoryInstance.moveHoldingsToAnotherInstance(initialInstanceHrId);
        InventoryInstancesMovement.closeInLeftForm();
        InventorySearchAndFilter.searchByParameter('Instance HRID', initialInstanceHrId);
        InventoryInstances.waitLoading();
        InventoryInstances.selectInstance();
        InventoryInstance.openHoldingView();
        HoldingsRecordView.checkHrId(holdingsRecordhrId);
        //TODO: Delete below two lines of code after Actions -> View source of Holding's view works as expected.
        HoldingsRecordView.close();
        InventoryInstance.openHoldingView();
        HoldingsRecordView.viewSource();
        InventoryViewSource.contains(`004\t${initialInstanceHrId}`);
      });
    });
  });
});
