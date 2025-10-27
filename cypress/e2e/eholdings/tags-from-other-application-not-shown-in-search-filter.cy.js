import { APPLICATION_NAMES } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import EHoldingsPackagesSearch from '../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingSearch from '../../support/fragments/eholdings/eHoldingsSearch';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';

describe('eHoldings', () => {
  const testData = {
    tag: `Instance_1_${getRandomPostfix()}`,
    successCallout: 'New tag created',
  };

  const createdRecordIDs = [];

  before('Creating user', () => {
    cy.getAdminToken();
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.moduleeHoldingsEnabled.gui,
      Permissions.uiTagsPermissionAll.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        createdRecordIDs.push(instanceData.instanceId);
      });
    });
  });

  beforeEach('Login to the application', () => {
    cy.waitForAuthRefresh(() => {
      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    }, 20_000);
  });

  after('Deleting created user', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
  });

  it(
    'C376614 Tags from another application are not shown in search filter for Packages, Titles, Providers (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire', 'C376614'] },
    () => {
      InventoryInstances.searchByTitle(createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventorySearchAndFilter.verifyInstanceDetailsView();
      InventorySearchAndFilter.openTagsField();
      InventorySearchAndFilter.verifyTagsView();
      InventorySearchAndFilter.verifyTagCount();
      InventorySearchAndFilter.addTag(testData.tag);
      InteractorsTools.checkCalloutMessage(testData.successCallout);

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EHOLDINGS);
      EHoldingsPackagesSearch.verifyTagAbsent(testData.tag);
      EHoldingSearch.switchToPackages();
      EHoldingsPackagesSearch.verifyTagAbsent(testData.tag);
      EHoldingSearch.switchToTitles();
      EHoldingsPackagesSearch.verifyTagAbsent(testData.tag);
    },
  );
});
