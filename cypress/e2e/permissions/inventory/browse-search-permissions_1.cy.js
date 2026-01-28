import { APPLICATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Permissions', () => {
  describe('Permissions --> Inventory', () => {
    const item = {
      instanceName: `instanceForRecord_${getRandomPostfix()}`,
      itemBarcode: getRandomPostfix(),
      publisher: null,
      holdingCallNumber: '1',
      itemCallNumber: 'DR 718',
      callNumber: 'PRT 718',
      copyNumber: 'c.4',
      callNumberSuffix: 'suf',
      volume: 'v.1',
      enumeration: 'e.2',
      chronology: 'ch.3',
    };
    let user;

    before(() => {
      cy.getAdminToken();
      InventoryInstances.createInstanceViaApi(
        item.instanceName,
        item.itemBarcode,
        item.publisher,
        item.holdingCallNumber,
        item.itemCallNumber,
      );

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.waitContentLoading();
      });
    });

    after('Deleting data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C375077 User with "Inventory: All permissions" permission can see browse call numbers and subjects without assigning specific browse permissions (Orchid+) (spitfire)',
      { tags: ['smoke', 'spitfire', 'C375077'] },
      () => {
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.selectBrowseCallNumbers();
        BrowseCallNumber.waitForCallNumberToAppear(item.itemCallNumber);
        InventorySearchAndFilter.browseSearch(item.itemCallNumber);
        InventorySearchAndFilter.verifyCallNumbersResultsInBrowsePane(item.itemCallNumber);
        InventorySearchAndFilter.clickResetAllButton();
        InventorySearchAndFilter.selectBrowseSubjects();
        InventorySearchAndFilter.browseSearch('art');
        InventorySearchAndFilter.verifySubjectsResultsInBrowsePane();
      },
    );
  });
});
