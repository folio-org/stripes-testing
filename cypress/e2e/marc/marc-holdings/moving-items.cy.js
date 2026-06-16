import { ITEM_STATUS_NAMES, LOCATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstancesMovement from '../../../support/fragments/inventory/holdingsMove/inventoryInstancesMovement';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventorySteps from '../../../support/fragments/inventory/inventorySteps';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    const successCalloutMessage = '1 item has been successfully moved.';
    const successHoldingCalloutMessage = '1 holding has been successfully moved.';
    const OCLCAuthentication = '100481406/PAOLF';
    let userId;
    let firstHolding = '';
    let secondHolding = '';
    let ITEM_BARCODE;
    let onlineLocationId;
    let popularReadingCollectionLocationId;
    const instanceTitle = `Barcode search test ${Number(new Date())}`;

    before(() => {
      cy.getAdminToken().then(() => {
        Z3950TargetProfiles.changeOclcWorldCatValueViaApi(OCLCAuthentication);
      });
    });

    beforeEach('navigates to Inventory', () => {
      let source;
      ITEM_BARCODE = `test${getRandomPostfix()}`;

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiInventoryMoveItems.gui,
        Permissions.uiInventorySingleRecordImport.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
        Permissions.uiInventoryHoldingsMove.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.converterStorageAll.gui,
      ]).then((userProperties) => {
        userId = userProperties.userId;

        cy.getAdminToken()
          .then(() => {
            cy.getLoanTypes({ limit: 1 });
            cy.getDefaultMaterialType();
            cy.getLocations({ limit: 2 });
            cy.getHoldingTypes({ limit: 2 });
            InventoryHoldings.getHoldingSources({ limit: 2 }).then((holdingsSources) => {
              source = holdingsSources;
            });
            cy.getLocations({ query: `name="${LOCATION_NAMES.ONLINE_UI}"` }).then((res) => {
              onlineLocationId = res.id;
            });
            cy.getLocations({
              query: `name="${LOCATION_NAMES.POPULAR_READING_COLLECTION_UI}"`,
            }).then((res) => {
              popularReadingCollectionLocationId = res.id;
            });
            cy.getInstanceTypes({ limit: 1 });
            ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' });
            cy.getUsers({
              limit: 1,
              query: `("username"="${userProperties.username}") and ("active"="true")`,
            });
          })
          .then(() => {
            firstHolding = 'Online';
            secondHolding = 'Popular Reading Collection';
            cy.createInstance({
              instance: {
                instanceTypeId: Cypress.env('instanceTypes')[0].id,
                title: instanceTitle,
              },
              holdings: [
                {
                  holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
                  permanentLocationId: onlineLocationId,
                  sourceId: source[0].id,
                },
                {
                  holdingsTypeId: Cypress.env('holdingsTypes')[1].id,
                  permanentLocationId: popularReadingCollectionLocationId,
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

            cy.login(userProperties.username, userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
      });
    });

    after('Delete all data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(ITEM_BARCODE);
      Users.deleteViaApi(userId);
    });

    it(
      'C15185 Move multiple items from one holdings to another holdings within an instance (firebird)',
      { tags: ['smoke', 'firebird', 'C15185', 'eurekaPhase1'] },
      () => {
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.byKeywords(instanceTitle);
        InventoryInstance.openMoveItemsWithinAnInstance();

        InventoryInstance.moveItemToAnotherHolding({
          fromHolding: firstHolding,
          toHolding: secondHolding,
        });
        InteractorsTools.checkCalloutMessage(successCalloutMessage);

        InventoryInstance.returnItemToFirstHolding(firstHolding, secondHolding);
        InteractorsTools.checkCalloutMessage(successCalloutMessage);
      },
    );

    it(
      'C345404 Move holdings record with Source = MARC to an instance record with source = MARC (folijet)',
      { tags: ['smoke', 'folijet', 'C345404'] },
      () => {
        cy.wait(5000);
        InventoryActions.import();
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          // additional instance record which will linked with holdings record initially
          InventoryActions.import();
          // TODO: redesign to api step
          InventorySteps.addMarcHoldingRecord();
          HoldingsRecordView.getHoldingsHrId().then((holdingsRecordhrId) => {
            HoldingsRecordView.close();
            InventoryInstance.waitLoading();
            InventoryInstance.moveHoldingsToAnotherInstance(initialInstanceHrId);
            InventoryInstancesMovement.closeInLeftForm();
            InteractorsTools.checkCalloutMessage(successHoldingCalloutMessage);
            InventorySearchAndFilter.searchByParameter('Instance HRID', initialInstanceHrId);
            InventoryInstances.waitLoading();
            InventoryInstances.selectInstance();
            InventoryInstance.openHoldingView();
            HoldingsRecordView.checkHrId(holdingsRecordhrId);
            HoldingsRecordView.viewSource();
            InventoryViewSource.contains(`004\t${initialInstanceHrId}`);
          });
        });
      },
    );
  });
});
