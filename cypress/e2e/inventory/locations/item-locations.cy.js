import { ITEM_STATUS_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const ITEM_BARCODE = `123${getRandomPostfix()}`;
let userId;
let source;

describe('ui-inventory: location', () => {
  before('create inventory instance', () => {
    cy.createTempUser([Permissions.inventoryAll.gui, Permissions.remoteStorageCRUD.gui]).then(
      (userProperties) => {
        userId = userProperties.userId;
        cy.login(userProperties.username, userProperties.password);
        cy.getAdminToken()
          .then(() => {
            cy.getLoanTypes({ limit: 1 });
            cy.getMaterialTypes({ limit: 1 });
            cy.getLocations({ limit: 2 });
            cy.getHoldingTypes({ limit: 1 });
            source = InventoryHoldings.getHoldingSources({ limit: 1 });
            cy.getInstanceTypes({ limit: 1 });
            ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' });
            cy.getUsers({
              limit: 1,
              query: `"personal.lastName"="${userProperties.username}" and "active"="true"`,
            });
          })
          .then(() => {
            cy.createInstance({
              instance: {
                instanceTypeId: Cypress.env('instanceTypes')[0].id,
                title: `Change item location test ${Number(new Date())}`,
              },
              holdings: [
                {
                  holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
                  permanentLocationId: Cypress.env('locations')[0].id,
                  sourceId: source.id,
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
                  {
                    barcode: `test${getRandomPostfix()}`,
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
      },
    );
    cy.visit(TopMenu.inventoryPath);
  });

  after('Delete all data', () => {
    cy.getAdminToken();
    cy.getInstance({ limit: 1, expandAll: true, query: `"items.barcode"=="${ITEM_BARCODE}"` }).then(
      (instance) => {
        cy.deleteItemViaApi(instance.items[0].id);
        cy.deleteItemViaApi(instance.items[1].id);
        cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        InventoryInstance.deleteInstanceViaApi(instance.id);
      },
    );
    Users.deleteViaApi(userId);
  });

  it(
    'C163923 Change a location to remote storage (firebird)',
    { tags: ['smoke', 'firebird'] },
    () => {
      const toBeEditedLocationName = Cypress.env('locations')[0].name;
      const editedLocationName = Cypress.env('locations')[1].name;

      // select instance
      InventorySearchAndFilter.switchToItem();
      cy.wait(2000);
      InventorySearchAndFilter.searchByParameter('Barcode', ITEM_BARCODE);
      ItemRecordView.waitLoading();
      ItemRecordView.closeDetailView();
      InventoryHoldings.checkIfExpanded('', true);
      InventoryInstance.openItemByBarcode(ITEM_BARCODE);

      // edit instance
      InventoryInstance.edit();
      InstanceRecordEdit.chooseTemporaryLocation(editedLocationName);
      InstanceRecordEdit.saveAndClose();
      InventoryInstance.closeInstancePage();

      // verify results
      // Setting false because next method clicks it open
      InventoryHoldings.checkIfExpanded('', false);
      InventoryInstance.checkHoldingsTable(
        toBeEditedLocationName,
        0,
        '-',
        ITEM_BARCODE,
        ITEM_STATUS_NAMES.AVAILABLE,
        editedLocationName,
      );
    },
  );

  it(
    'C163924 Change a remote storage location to standard location (firebird)',
    { tags: ['smoke', 'firebird'] },
    () => {
      const toBeEditedLocationName = Cypress.env('locations')[1].name;
      const editedLocationName = Cypress.env('locations')[0].name;

      // select instance
      InventorySearchAndFilter.switchToItem();
      cy.wait(2000);
      InventorySearchAndFilter.searchByParameter('Barcode', ITEM_BARCODE);
      ItemRecordView.waitLoading();
      ItemRecordView.closeDetailView();
      InventoryHoldings.checkIfExpanded('', true);
      InventoryInstance.openItemByBarcode(ITEM_BARCODE);

      // edit instance
      InventoryInstance.edit();
      InstanceRecordEdit.choosePermanentLocation(toBeEditedLocationName);
      InstanceRecordEdit.saveAndClose();
      InventoryInstance.closeInstancePage();

      // verify results
      // Setting false because next method clicks it open
      InventoryHoldings.checkIfExpanded('', false);
      InventoryInstance.checkHoldingsTable(
        editedLocationName,
        0,
        '-',
        ITEM_BARCODE,
        ITEM_STATUS_NAMES.AVAILABLE,
        toBeEditedLocationName,
      );
    },
  );
});
