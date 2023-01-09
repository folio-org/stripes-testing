import TopMenu from '../../../support/fragments/topMenu';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TestTypes from '../../../support/dictionary/testTypes';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import permissions from '../../../support/dictionary/permissions';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import devTeams from '../../../support/dictionary/devTeams';
import users from '../../../support/fragments/users/users';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import ItemView from '../../../support/fragments/inventory/inventoryItem/itemView';

const ITEM_BARCODE = `123${getRandomPostfix()}`;
let userId;
let source;

describe('ui-inventory: location', () => {
  before('create inventory instance', () => {
    cy.createTempUser([
      permissions.inventoryAll.gui,
      permissions.remoteStorageCRUD.gui,
    ])
      .then(userProperties => {
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
              query: `"personal.lastName"="${userProperties.username}" and "active"="true"`
            });
          })
          .then(() => {
            cy.createInstance({
              instance: {
                instanceTypeId: Cypress.env('instanceTypes')[0].id,
                title: `Change item location test ${Number(new Date())}`,
              },
              holdings: [{
                holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
                permanentLocationId: Cypress.env('locations')[0].id,
                sourceId: source.id,
              }],
              items: [
                [
                  {
                    barcode: ITEM_BARCODE,
                    missingPieces: '3',
                    numberOfMissingPieces: '3',
                    status: { name: 'Available' },
                    permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
                    materialType: { id: Cypress.env('materialTypes')[0].id },
                  },
                  {
                    barcode: `test${getRandomPostfix()}`,
                    missingPieces: '3',
                    numberOfMissingPieces: '3',
                    status: { name: 'Available' },
                    permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
                    materialType: { id: Cypress.env('materialTypes')[0].id },
                  }
                ],
              ],
            });
          });
      });
    cy.visit(TopMenu.inventoryPath);
  });

  after('Delete all data', () => {
    cy.getInstance({ limit: 1, expandAll: true, query: `"items.barcode"=="${ITEM_BARCODE}"` })
      .then((instance) => {
        cy.deleteItem(instance.items[0].id);
        cy.deleteItem(instance.items[1].id);
        cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
    users.deleteViaApi(userId);
  });

  it('C163923 Change a location to remote storage (firebird)', { tags: [TestTypes.smoke, devTeams.firebird] }, () => {
    const toBeEditedLocationName = Cypress.env('locations')[0].name;
    const editedLocationName = Cypress.env('locations')[1].name;

    // select instance
    InventorySearchAndFilter.switchToItem();
    InventorySearchAndFilter.searchByParameter('Barcode', ITEM_BARCODE);
    InventoryInstances.selectInstance();
    ItemView.closeDetailView();
    InventoryInstance.openHoldings([toBeEditedLocationName]);
    InventoryInstance.openItemView(ITEM_BARCODE);

    // edit instance
    InventoryInstance.openEditItemPage();
    InstanceRecordEdit.chooseTemporaryLocation(editedLocationName);
    InstanceRecordEdit.saveAndClose();
    InventoryInstance.closeInstancePage();

    // verify results
    InventoryInstance.checkHoldingsTable(
      toBeEditedLocationName,
      0,
      '-',
      ITEM_BARCODE,
      'Available',
      editedLocationName
    );
  });

  it('C163924 Change a remote storage location to standard location (firebird)', { tags: [TestTypes.smoke, devTeams.firebird] }, () => {
    const toBeEditedLocationName = Cypress.env('locations')[1].name;
    const editedLocationName = Cypress.env('locations')[0].name;

    // select instance
    InventorySearchAndFilter.switchToItem();
    InventorySearchAndFilter.searchByParameter('Barcode', ITEM_BARCODE);
    InventoryInstances.selectInstance();
    ItemView.closeDetailView();
    InventoryInstance.openHoldings([editedLocationName]);
    InventoryInstance.openItemView(ITEM_BARCODE);

    // edit instance
    InventoryInstance.openEditItemPage();
    InstanceRecordEdit.choosePermanentLocation(toBeEditedLocationName);
    InstanceRecordEdit.saveAndClose();
    InventoryInstance.closeInstancePage();

    // verify results
    InventoryInstance.checkHoldingsTable(
      editedLocationName,
      0,
      '-',
      ITEM_BARCODE,
      'Available',
      toBeEditedLocationName
    );
  });
});
