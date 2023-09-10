import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import TestTypes from '../../../support/dictionary/testTypes';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import devTeams from '../../../support/dictionary/devTeams';
import Users from '../../../support/fragments/users/users';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';

describe('permissions: inventory', () => {
  const item = {
    instanceName: `instanceForRecord_${getRandomPostfix()}`,
    itemBarcode: getRandomPostfix(),
    publisher: null,
    holdingCallNumber: '1',
    itemCallNumber: 'RR 718',
    callNumber: 'PRT 718',
    copyNumber: 'c.4',
    callNumberSuffix: 'suf',
    volume: 'v.1',
    enumeration: 'e.2',
    chronology: 'ch.3',
  };
  let userWithOnlyViewPermissions;
  let userWithAllPermissions;

  before(() => {
    cy.getAdminToken();
    InventoryInstances.createInstanceViaApi(
      item.instanceName,
      item.itemBarcode,
      item.publisher,
      item.holdingCallNumber,
      item.itemCallNumber,
    );

    cy.createTempUser([permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
      userWithOnlyViewPermissions = userProperties;
    });
    cy.createTempUser([permissions.inventoryAll.gui]).then((userProperties) => {
      userWithAllPermissions = userProperties;
    });
  });

  after('Deleting data', () => {
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    Users.deleteViaApi(userWithOnlyViewPermissions.userId);
    Users.deleteViaApi(userWithAllPermissions.userId);
  });

  it(
    'C375072 User with "Inventory: View instances, holdings, and items" permission can see browse call numbers and subjects without assigning specific browse permissions (Orchid+) (thunderjet)',
    { tags: [TestTypes.smoke, devTeams.thunderjet] },
    () => {
      cy.login(userWithOnlyViewPermissions.username, userWithOnlyViewPermissions.password);
      cy.visit(TopMenu.inventoryPath);
      InventorySearchAndFilter.switchToBrowseTab();
      InventorySearchAndFilter.selectBrowseCallNumbers();
      InventorySearchAndFilter.browseSearch(item.itemCallNumber);
      InventorySearchAndFilter.verifyCallNumbersResultsInBrowsePane(item.itemCallNumber);
      cy.visit(TopMenu.inventoryPath);
      InventorySearchAndFilter.switchToBrowseTab();
      InventorySearchAndFilter.selectBrowseSubjects();
      InventorySearchAndFilter.browseSearch('art');
      InventorySearchAndFilter.verifySubjectsResultsInBrowsePane();
    },
  );

  it(
    'C375077 User with "Inventory: All permissions" permission can see browse call numbers and subjects without assigning specific browse permissions (Orchid+) (thunderjet)',
    { tags: [TestTypes.smoke, devTeams.thunderjet] },
    () => {
      cy.login(userWithAllPermissions.username, userWithAllPermissions.password);
      cy.visit(TopMenu.inventoryPath);
      InventorySearchAndFilter.switchToBrowseTab();
      InventorySearchAndFilter.selectBrowseCallNumbers();
      InventorySearchAndFilter.browseSearch(item.itemCallNumber);
      InventorySearchAndFilter.verifyCallNumbersResultsInBrowsePane(item.itemCallNumber);
      cy.visit(TopMenu.inventoryPath);
      InventorySearchAndFilter.switchToBrowseTab();
      InventorySearchAndFilter.selectBrowseSubjects();
      InventorySearchAndFilter.browseSearch('art');
      InventorySearchAndFilter.verifySubjectsResultsInBrowsePane();
    },
  );
});
