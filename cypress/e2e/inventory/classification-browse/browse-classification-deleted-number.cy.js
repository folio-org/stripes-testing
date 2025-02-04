import { Permissions } from '../../../support/dictionary';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { CLASSIFICATION_IDENTIFIER_TYPES } from '../../../support/constants';
import ClassificationBrowse, {
  defaultClassificationBrowseIdsAlgorithms,
} from '../../../support/fragments/settings/inventory/instances/classificationBrowse';
import BrowseClassifications from '../../../support/fragments/inventory/search/browseClassifications';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';

describe('Inventory', () => {
  describe('Instance classification browse', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instance: {
        instanceTitle: `C471477 Autotest Instance ${randomPostfix}`,
        classificationType: CLASSIFICATION_IDENTIFIER_TYPES.ADDITIONAL_DEWEY,
        classificationNumber: `YC471477number ${randomPostfix}`,
      },
      classificationOption: 'Classification (all)',
      classificationIdentifierTypeName: 'Additional Dewey',
      classificationBrowseId: defaultClassificationBrowseIdsAlgorithms[0].id,
      classificationBrowseAlgorithm: defaultClassificationBrowseIdsAlgorithms[0].algorithm,
    };
    let createdRecordId;
    let user;

    before('Create user, test data', () => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      InventoryInstances.deleteInstanceByTitleViaApi('C471477*');

      cy.createTempUser([Permissions.inventoryAll.gui]).then((createdUserProperties) => {
        user = createdUserProperties;

        // remove all identifier types from target classification browse, if any
        ClassificationBrowse.getIdentifierTypesForCertainBrowseAPI(
          testData.classificationBrowseId,
        ).then((types) => {
          testData.originalTypes = types;
          ClassificationBrowse.updateIdentifierTypesAPI(
            testData.classificationBrowseId,
            testData.classificationBrowseAlgorithm,
            [],
          );

          cy.getInstanceTypes({ limit: 1 })
            .then((instanceTypes) => {
              testData.instanceTypeId = instanceTypes[0].id;
            })
            .then(() => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: testData.instanceTypeId,
                  title: testData.instance.instanceTitle,
                  classifications: [
                    {
                      classificationNumber: testData.instance.classificationNumber,
                      classificationTypeId: testData.instance.classificationType,
                    },
                  ],
                },
              }).then((instance) => {
                createdRecordId = instance.instanceId;

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
    });

    after('Delete user, test data', () => {
      cy.getAdminToken();
      // restore the original identifier types for target classification browse
      ClassificationBrowse.updateIdentifierTypesAPI(
        testData.classificationBrowseId,
        testData.classificationBrowseAlgorithm,
        testData.originalTypes,
      );
      InventoryInstance.deleteInstanceViaApi(createdRecordId);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C471477 Deleted Classification values cannot be found in browse classifications result list (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C471477'] },
      () => {
        InventorySearchAndFilter.selectBrowseOption(testData.classificationOption);
        BrowseClassifications.waitForClassificationNumberToAppear(
          testData.instance.classificationNumber,
        );
        InventorySearchAndFilter.browseSearch(testData.instance.classificationNumber);
        BrowseClassifications.verifySearchResultsTable();
        InventorySearchAndFilter.verifySearchResultIncludingValue(
          testData.instance.classificationNumber,
        );

        BrowseClassifications.selectFoundValueByRow(5, testData.instance.classificationNumber);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.instance.instanceTitle);
        InventoryInstances.selectInstanceById(createdRecordId);

        InventoryInstance.verifyClassificationValueInView(
          testData.classificationIdentifierTypeName,
          testData.instance.classificationNumber,
        );

        InstanceRecordView.edit();
        InstanceRecordEdit.removeClassificationNumber(testData.instance.classificationNumber);
        InstanceRecordEdit.saveAndClose();
        InventoryInstance.checkInstanceTitle(testData.instance.instanceTitle);

        InventoryInstance.verifyClassificationValueInView(
          testData.classificationIdentifierTypeName,
          testData.instance.classificationNumber,
          false,
        );

        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifyCallNumberBrowsePane();
        InventorySearchAndFilter.clickResetAllButton();
        BrowseClassifications.waitForClassificationNumberToAppear(
          testData.instance.classificationNumber,
          false,
        );
        InventorySearchAndFilter.selectBrowseOption(testData.classificationOption);
        InventorySearchAndFilter.browseSearch(testData.instance.classificationNumber);
        BrowseClassifications.verifySearchResultsTable();
        InventorySearchAndFilter.verifyContentNotExistInSearchResult(
          testData.instance.classificationNumber,
        );
      },
    );
  });
});
