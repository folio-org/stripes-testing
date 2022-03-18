import TopMenu from '../../support/fragments/topMenu';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import searchInventory from '../../support/fragments/data_import/searchInventory';
import { MultiColumnListCell } from '../../../interactors';
import permissions from '../../support/dictionary/permissions';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import HoldingsRecordView from '../../support/fragments/inventory/holdingsRecordView';
import getRandomPostfix from '../../support/utils/stringTools';

describe('ui-inventory: Create a Holdings record as another user than the one that created the Instance', () => {
  let firstUser;
  let secondUser;
  const recordsData = {
    instanceTitle: `e2e-Instance${getRandomPostfix()}`,
    permanentLocationOption: 'Online (E) ',
    permanentLocationValue: 'Online',
    source: 'FOLIO'
  };

  beforeEach(() => {
    cy
      .createTempUser([permissions.inventoryAll.gui])
      .then((userProperties) => {
        firstUser = userProperties;
      });

    cy
      .createTempUser([permissions.inventoryAll.gui])
      .then(userProperties => {
        secondUser = userProperties;
        cy.login(secondUser.username, secondUser.password);
        cy.visit(TopMenu.inventoryPath);
      });
  });

  afterEach(() => {
    cy.deleteUser(firstUser.userId);
    cy.deleteUser(secondUser.userId);
  });

  it('C1294: Create a Holdings record as another user than the one that created the Instance', () => {
    InventoryInstances.add(recordsData.instanceTitle);
    searchInventory.searchInstanceByTitle(recordsData.instanceTitle);
    cy.expect(MultiColumnListCell({ row: 0, column: recordsData.instanceTitle }).exists());

    // logout and login as a different user
    cy.logout();
    cy.login(firstUser.username, firstUser.password);

    cy.visit(TopMenu.inventoryPath);
    searchInventory.searchInstanceByTitle(recordsData.instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.waitLoading();
    InventoryInstance.createHoldingsRecord(recordsData.permanentLocationOption);

    InventoryInstance.goToHoldingView();
    HoldingsRecordView.checkSource(recordsData.source);
    HoldingsRecordView.checkPermanentLocation(recordsData.permanentLocationValue);
  });
});
