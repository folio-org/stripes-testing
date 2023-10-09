import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import { MultiColumnListCell } from '../../../../interactors';
import permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import TestTypes from '../../../support/dictionary/testTypes';
import Users from '../../../support/fragments/users/users';
import Helper from '../../../support/fragments/finance/financeHelper';
import DevTeams from '../../../support/dictionary/devTeams';
import { INSTANCE_SOURCE_NAMES, LOCATION_NAMES } from '../../../support/constants';

describe('inventory', () => {
  describe('Holdings', () => {
    let firstUser;
    let secondUser;
    const instanceTitle = `autoTestInstanceTitle ${Helper.getRandomBarcode()}`;
    const recordsData = {
      instanceTitle,
      permanentLocationOption: 'Online (E) ',
      permanentLocationValue: LOCATION_NAMES.ONLINE_UI,
      source: INSTANCE_SOURCE_NAMES.FOLIO,
    };

    beforeEach(() => {
      cy.createTempUser([permissions.inventoryAll.gui]).then((userProperties) => {
        firstUser = userProperties;
      });

      cy.createTempUser([permissions.inventoryAll.gui]).then((userProperties) => {
        secondUser = userProperties;
        cy.login(secondUser.username, secondUser.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    afterEach(() => {
      cy.getInstance({ limit: 1, expandAll: true, query: `"title"=="${instanceTitle}"` }).then(
        (instance) => {
          cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
          InventoryInstance.deleteInstanceViaApi(instance.id);
        },
      );
      Users.deleteViaApi(firstUser.userId);
      Users.deleteViaApi(secondUser.userId);
    });

    it(
      'C1294: Create a Holdings record as another user than the one that created the Instance (folijet) (prokopovych)',
      { tags: [TestTypes.smoke, DevTeams.folijet] },
      () => {
        InventoryInstances.add(recordsData.instanceTitle);
        InventorySearchAndFilter.searchInstanceByTitle(recordsData.instanceTitle);
        cy.expect(MultiColumnListCell({ row: 0, content: recordsData.instanceTitle }).exists());

        // logout and login as a different user
        cy.logout();
        cy.login(firstUser.username, firstUser.password);

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchInstanceByTitle(recordsData.instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.createHoldingsRecord(recordsData.permanentLocationOption);

        InventoryInstance.openHoldingView();
        HoldingsRecordView.checkSource(recordsData.source);
        HoldingsRecordView.checkPermanentLocation(recordsData.permanentLocationValue);
      },
    );
  });
});
