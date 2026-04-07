import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Contributors Browse', () => {
    const testValue = 'Test';
    const randomPostfix = getRandomPostfix();
    const instanceTitle = `AT_C380402_MarcBibInstance_${randomPostfix}`;
    const contributorName = `AT_C380402_Contributor_${randomPostfix}`;
    const updatedInstanceTitle = `${instanceTitle} ${testValue}`;

    const tags = {
      tag008: '008',
      tag245: '245',
      tag700: '700',
      tag852: '852',
    };

    const marcBibFields = [
      {
        tag: tags.tag008,
        content: QuickMarcEditor.valid008ValuesInstance,
      },
      {
        tag: tags.tag245,
        content: `$a ${instanceTitle}`,
        indicators: ['1', '1'],
      },
      {
        tag: tags.tag700,
        content: `$a ${contributorName}`,
        indicators: ['1', '\\'],
      },
    ];

    let user;
    let instanceId;
    let locationCode;

    before('Creating user and test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C380402');

      cy.then(() => {
        cy.getLocations({
          limit: 1,
          query: '(name<>"*autotest*" and name<>"AT_*" and name<>"*auto*")',
        }).then((location) => {
          locationCode = location.code;
          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
            (createdInstanceId) => {
              instanceId = createdInstanceId;
              cy.getInstanceById(instanceId).then((instanceData) => {
                cy.createSimpleMarcHoldingsViaAPI(instanceData.id, instanceData.hrid, locationCode);
              });
            },
          );
        });
      }).then(() => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        ]).then((createdUserProperties) => {
          user = createdUserProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
        });
      });
    });

    after('Deleting created user and test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
    });

    it(
      'C380402 Browse contributors pane remains same results when user switches to search pane and back (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C380402'] },
      () => {
        // Step 1-2: Switch to browse, select Contributors, browse for contributor
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.validateBrowseToggleIsSelected();
        BrowseContributors.select();
        BrowseContributors.waitForContributorToAppear(contributorName);
        BrowseContributors.browse(contributorName);
        BrowseContributors.checkSearchResultRecord(contributorName);

        // Step 3: Click on contributor name (Number of titles = 1) to open instance detail
        BrowseContributors.openRecord(contributorName);
        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventorySearchAndFilter.checkRowsCount(1);
        InventoryInstance.verifyInstanceTitle(instanceTitle);

        // Step 4: Click on Search tab - detail view closes, first and second panes remain
        InventorySearchAndFilter.switchToSearchTab();
        InventorySearchAndFilter.verifyInstanceDetailsView(false);
        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventorySearchAndFilter.checkRowsCount(1);
        InventorySearchAndFilter.verifySearchResult(instanceTitle);

        // Step 5: Click on instance title, then Actions > Edit MARC bibliographic record
        InventorySearchAndFilter.selectSearchResultItem();
        InstanceRecordView.editMarcBibliographicRecord();
        QuickMarcEditor.waitLoading();

        // Step 6: Edit 245 field and save
        QuickMarcEditor.updateExistingField(tags.tag245, `$a ${updatedInstanceTitle}`);
        QuickMarcEditor.pressSaveAndClose();
        InventoryInstance.verifyInstanceTitle(updatedInstanceTitle);

        // Step 7: Click "View holdings" button
        InventoryInstance.openHoldingView();

        // Step 8: Click Actions > Edit in quickMARC
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.waitLoading();

        // Step 9: Edit 852 field and save
        QuickMarcEditor.updateExistingField(tags.tag852, `$b ${locationCode} $t ${testValue}`);
        QuickMarcEditor.pressSaveAndClose();
        HoldingsRecordView.waitLoading();

        // Step 10: Close holdings detail view
        HoldingsRecordView.close();
        InventorySearchAndFilter.verifySearchResult(updatedInstanceTitle);
        InventoryInstance.verifyInstanceTitle(updatedInstanceTitle);

        // Step 11: Click "Reset all" button
        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        InventorySearchAndFilter.checkSearchQueryText('');

        // Step 12: Click "Browse" tab - browse pane should show same results as step 2
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.validateBrowseToggleIsSelected();
        BrowseContributors.verifySearchTerm(contributorName);
        BrowseContributors.checkSearchResultRecord(contributorName);
      },
    );
  });
});
