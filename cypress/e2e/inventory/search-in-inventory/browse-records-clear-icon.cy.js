import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitlePrefix: `AT_C423624_FolioInstance_${randomPostfix}`,
      query: `AT_C423624_BrowseValue_${randomPostfix}`,
      user: {},
    };
    const folioInstances = InventoryInstances.generateFolioInstances({
      count: 1,
      instanceTitlePrefix: testData.instanceTitlePrefix,
      holdingsCount: 1,
      itemsCount: 1,
      itemsProperties: {
        itemLevelCallNumber: testData.query,
      },
    });
    let contributorNameTypeId;
    let location;
    let instanceId;

    function browseAndVerifyClearIconWorks() {
      InventorySearchAndFilter.fillInBrowseSearch(testData.query);
      InventorySearchAndFilter.checkBrowseSearchInputFieldContent(testData.query);
      InventorySearchAndFilter.checkSearchButtonEnabled();
      InventorySearchAndFilter.focusOnBrowseField();
      InventorySearchAndFilter.checkClearIconShownInBrowseField();

      InventorySearchAndFilter.clearBrowseInputField();
      InventorySearchAndFilter.checkClearIconShownInBrowseField(false);
      InventorySearchAndFilter.checkBrowseSearchInputFieldInFocus(true);

      InventorySearchAndFilter.fillInBrowseSearch(testData.query);
      InventorySearchAndFilter.checkBrowseSearchInputFieldContent(testData.query);
      InventorySearchAndFilter.checkSearchButtonEnabled();
      InventorySearchAndFilter.focusOnBrowseField();
      InventorySearchAndFilter.checkClearIconShownInBrowseField();

      InventorySearchAndFilter.clickSearch();
      InventorySearchAndFilter.verifyBrowseResultListExists();
      InventorySearchAndFilter.checkBrowseSearchInputFieldInFocus(false);
      InventorySearchAndFilter.checkClearIconShownInBrowseField(false);
      InventorySearchAndFilter.verifyBrowseInventorySearchResults({
        records: [{ callNumber: testData.query }],
      });

      InventorySearchAndFilter.focusOnBrowseField();
      InventorySearchAndFilter.checkClearIconShownInBrowseField(true);
      InventorySearchAndFilter.checkBrowseSearchInputFieldInFocus(true);

      InventorySearchAndFilter.resizeBrowseInputField(200, undefined);
      InventorySearchAndFilter.verifyBrowseInputFieldSize(200, undefined);
      InventorySearchAndFilter.checkClearIconShownInBrowseField(true);

      InventorySearchAndFilter.clearBrowseInputField();
      InventorySearchAndFilter.verifyBrowseResultListExists(false);
      InventorySearchAndFilter.checkClearIconShownInBrowseField(false);
      InventorySearchAndFilter.checkBrowseSearchInputFieldInFocus(true);
    }

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C423624');

      cy.then(() => {
        BrowseContributors.getContributorNameTypes().then((contributorNameTypes) => {
          contributorNameTypeId = contributorNameTypes[0].id;
        });
        cy.getLocations({
          limit: 1,
          query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
        }).then((res) => {
          location = res;
        });
      })
        .then(() => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances,
            location,
          });
        })
        .then(() => {
          instanceId = folioInstances[0].instanceId;
          cy.getInstanceById(instanceId).then((body) => {
            const updatedBody = { ...body };
            updatedBody.subjects = [{ value: testData.query }];
            updatedBody.contributors = [
              {
                name: testData.query,
                contributorNameTypeId,
                contributorTypeId: null,
                contributorTypeText: '',
                primary: false,
              },
            ];
            cy.updateInstance(updatedBody);
          });
        })
        .then(() => {
          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
            testData.user = userProperties;
          });
        });
    });

    beforeEach('Login', () => {
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
        authRefresh: true,
      });
      InventorySearchAndFilter.switchToBrowseTab();
      InventorySearchAndFilter.validateBrowseToggleIsSelected();
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C423624 Call numbers browse | Check the "x" icon in the Inventory app search box (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C423624'] },
      () => {
        BrowseCallNumber.waitForCallNumberToAppear(testData.query);
        InventorySearchAndFilter.selectBrowseCallNumbers();

        browseAndVerifyClearIconWorks();
      },
    );

    it(
      'C423626 Contributors browse | Check the "x" icon in the Inventory app search box (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C423626'] },
      () => {
        BrowseContributors.waitForContributorToAppear(testData.query);
        BrowseContributors.select();

        browseAndVerifyClearIconWorks();
      },
    );

    it(
      'C423627 Subjects browse | Check the "x" icon in the Inventory app search box (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C423627'] },
      () => {
        BrowseSubjects.waitForSubjectToAppear(testData.query);
        BrowseSubjects.select();

        browseAndVerifyClearIconWorks();
      },
    );
  });
});
