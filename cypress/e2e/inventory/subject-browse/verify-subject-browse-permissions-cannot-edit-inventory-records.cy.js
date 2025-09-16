import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      user: {},
      instanceTitle: `AT_C375064_FolioInstance_${randomPostfix}`,
      subjectHeading: `AT_C375064_Subject_${randomPostfix}`,
    };
    const subjectOptionValue = 'subject';

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C375064');
      cy.then(() => {
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1, query: 'source=folio' }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        cy.getLocations({
          limit: 1,
          query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
        }).then((res) => {
          testData.locationId = res.id;
        });
      }).then(() => {
        // Create instance with subject
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: testData.instanceTitle,
            subjects: [
              {
                value: testData.subjectHeading,
              },
            ],
          },
          holdings: [
            {
              holdingsTypeId: testData.holdingTypeId,
              permanentLocationId: testData.locationId,
            },
          ],
        }).then(() => {
          // Create user with only subject browse view permissions
          cy.createTempUser([Permissions.uiSubjectBrowse.gui]).then((userProperties) => {
            testData.user = userProperties;

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C375064');
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C375064 Verify that Users with Subject browse permissions cannot edit inventory records (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C375064'] },
      () => {
        // Step 1: Select "Subjects" browse option from the dropdown and verify UI state
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifyKeywordsAsDefault();
        BrowseSubjects.select();
        BrowseSubjects.waitForSubjectToAppear(testData.subjectHeading);

        // Step 2: Enter subject search term and verify button activation
        // Step 3: Execute search and verify results display
        BrowseSubjects.browse(testData.subjectHeading);
        BrowseSubjects.checkSearchResultRecord(testData.subjectHeading);
        BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(
          testData.subjectHeading,
          1,
        );

        // Step 4: Click subject hyperlink and verify search transition
        BrowseSubjects.openInstance({ name: testData.subjectHeading });
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventorySearchAndFilter.verifySelectedSearchOption(subjectOptionValue);
        InventorySearchAndFilter.checkRowsCount(1);

        // Step 5: Open instance record detail view
        InventoryInstances.selectInstanceByTitle(testData.instanceTitle);
        InventoryInstance.verifyInstanceTitle(testData.instanceTitle);

        // Step 6: Verify absence of edit capabilities - no Actions button, no Add holdings button, no Add item button
        InventoryInstance.checkButtonsShown({ actions: false, addHoldings: false, addItem: false });

        // Step 7: Open holdings view and verify no Actions menu
        InstanceRecordView.openHoldingView(false);
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.checkActionsButtonShown(false);

        // Step 8: Close holdings view and return to instance view
        HoldingsRecordView.close();
        InventoryInstance.verifyInstanceTitle(testData.instanceTitle);
      },
    );
  });
});
