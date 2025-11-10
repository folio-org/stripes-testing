import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import { classificationIdentifierTypesDropdownDefaultOptions } from '../../../support/fragments/settings/inventory/instances/classificationBrowse';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import BrowseClassifications from '../../../support/fragments/inventory/search/browseClassifications';
import { CLASSIFICATION_IDENTIFIER_TYPES } from '../../../support/constants';

describe('Inventory', () => {
  describe('Instance classification browse', () => {
    const randomPostfix = getRandomPostfix();
    const randomPrefix = `C916258${getRandomLetters(7)}`;
    const testData = {
      instanceTitle: `C916258_FolioInstance_${randomPostfix}`,
      classifications: {
        classificationNumber: `${randomPrefix}test "value"`,
        classificationTypeId: CLASSIFICATION_IDENTIFIER_TYPES.LC,
        typeName: classificationIdentifierTypesDropdownDefaultOptions[4], // 'LC'
      },
    };
    const escapedClassification = testData.classifications.classificationNumber.replace(
      /"/g,
      '\\"',
    );
    const querySearchOption = 'Query search';

    let instanceId;
    let user;

    before('Creating user and test data', () => {
      cy.getAdminToken();
      // Clean up any existing instances
      InventoryInstances.deleteInstanceByTitleViaApi('C916258*');

      cy.createTempUser([Permissions.inventoryAll.gui]).then((createdUserProperties) => {
        user = createdUserProperties;

        // Create instance with classification
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          const instanceTypeId = instanceTypes[0].id;
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId,
              title: testData.instanceTitle,
              classifications: [
                {
                  classificationNumber: testData.classifications.classificationNumber,
                  classificationTypeId: testData.classifications.classificationTypeId,
                },
              ],
            },
          }).then((instance) => {
            instanceId = instance.instanceId;

            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            InventorySearchAndFilter.switchToBrowseTab();
            InventorySearchAndFilter.verifyCallNumberBrowsePane();
          });
        });
      });
    });

    after('Deleting created user and test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(instanceId);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C916258 Browse for Classification with double quotes (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C916258'] },
      () => {
        InventorySearchAndFilter.selectBrowseOption('Classification (all)');
        BrowseClassifications.waitForClassificationNumberToAppear(
          testData.classifications.classificationNumber,
        );

        // 1. Browse for created classifications
        InventorySearchAndFilter.browseSearch(testData.classifications.classificationNumber);
        BrowseClassifications.verifySearchResultsTable();
        InventorySearchAndFilter.verifySearchResultIncludingValue(
          testData.classifications.classificationNumber,
        );

        // 2. Click on found value, which has double quotes
        BrowseClassifications.selectFoundValueByRow(
          5,
          testData.classifications.classificationNumber,
        );
        InventorySearchAndFilter.verifySearchOptionAndQuery(
          querySearchOption,
          `classifications.classificationNumber=="${escapedClassification}"`,
        );
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.instanceTitle);
        InventoryInstances.selectInstanceById(instanceId);

        InventoryInstance.verifyClassificationValueInView(
          testData.classifications.typeName,
          testData.classifications.classificationNumber,
        );
      },
    );
  });
});
