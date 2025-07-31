import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import { CLASSIFICATION_IDENTIFIER_TYPES } from '../../../support/constants';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import ClassificationIdentifierTypes from '../../../support/fragments/settings/inventory/instances/classificationIdentifierTypes';
import { classificationIdentifierTypesDropdownDefaultOptions } from '../../../support/fragments/settings/inventory/instances/classificationBrowse';

describe('Inventory', () => {
  describe('Instance classification browse', () => {
    const randomPostfix = getRandomPostfix();
    const randomPrefix = `C490935${getRandomLetters(7)}`;
    const localClassificationIdentifierType = {
      name: `C490935 Local Classification ${randomPostfix}`,
      source: 'local',
    };
    const testData = {
      instanceTitle: `AT_C490935_FolioInstance_${randomPostfix}`,
      classifications: [
        {
          classificationNumber: `${randomPrefix}598.09`,
          classificationTypeId: CLASSIFICATION_IDENTIFIER_TYPES.ADDITIONAL_DEWEY,
          typeName: classificationIdentifierTypesDropdownDefaultOptions[0], // 'Additional Dewey'
        },
        {
          classificationNumber: `${randomPrefix}HT154`,
          classificationTypeId: CLASSIFICATION_IDENTIFIER_TYPES.CANADIAN_CLASSIFICATION,
          typeName: classificationIdentifierTypesDropdownDefaultOptions[1], // 'Canadian Classification'
        },
        {
          classificationNumber: `${randomPrefix}742.2`,
          classificationTypeId: CLASSIFICATION_IDENTIFIER_TYPES.DEWEY,
          typeName: classificationIdentifierTypesDropdownDefaultOptions[2], // 'Dewey'
        },
        {
          classificationNumber: `${randomPrefix}HEU/G74.3C49`,
          classificationTypeId: CLASSIFICATION_IDENTIFIER_TYPES.GDC,
          typeName: classificationIdentifierTypesDropdownDefaultOptions[3], // 'GDC'
        },
        {
          classificationNumber: `${randomPrefix}QS 11 .GA1 E53 2005`,
          classificationTypeId: CLASSIFICATION_IDENTIFIER_TYPES.LC,
          typeName: classificationIdentifierTypesDropdownDefaultOptions[4], // 'LC'
        },
        {
          classificationNumber: `${randomPrefix}DD259.4 .B527 1973`,
          classificationTypeId: CLASSIFICATION_IDENTIFIER_TYPES.LC_LOCAL,
          typeName: classificationIdentifierTypesDropdownDefaultOptions[5], // 'LC (local)'
        },
        {
          classificationNumber: `${randomPrefix}HD3492.H8`,
          classificationTypeId: CLASSIFICATION_IDENTIFIER_TYPES.NATIONAL_AGRICULTURAL_LIBRARY,
          typeName: classificationIdentifierTypesDropdownDefaultOptions[6], // 'National Agricultural Library'
        },
        {
          classificationNumber: `${randomPrefix}SB945.A5`,
          classificationTypeId: CLASSIFICATION_IDENTIFIER_TYPES.NLM,
          typeName: classificationIdentifierTypesDropdownDefaultOptions[7], // 'NLM'
        },
        {
          classificationNumber: `${randomPrefix}L37.s:Oc1/2/991`,
          classificationTypeId: CLASSIFICATION_IDENTIFIER_TYPES.SUDOC,
          typeName: classificationIdentifierTypesDropdownDefaultOptions[8], // 'SUDOC'
        },
        {
          classificationNumber: `${randomPrefix}631.321:631.411.3`,
          classificationTypeId: CLASSIFICATION_IDENTIFIER_TYPES.UDC,
          typeName: classificationIdentifierTypesDropdownDefaultOptions[9], // 'UDC'
        },
        {
          classificationNumber: `${randomPrefix}LOCAL123`,
          classificationTypeId: null, // Will be set to local classification type ID after creation
          typeName: localClassificationIdentifierType.name,
        },
      ],
    };

    let instanceId;
    let user;
    let localClassificationTypeId;

    before('Create user and test data', () => {
      cy.getAdminToken();
      // Clean up any existing instances
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C490935*');

      cy.createTempUser([Permissions.inventoryAll.gui]).then((createdUserProperties) => {
        user = createdUserProperties;

        // Create local classification identifier type
        ClassificationIdentifierTypes.createViaApi(localClassificationIdentifierType).then(
          (response) => {
            localClassificationTypeId = response.body.id;
            // Update the local classification in test data with the created ID
            testData.classifications[10].classificationTypeId = localClassificationTypeId;

            cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
              const instanceTypeId = instanceTypes[0].id;

              // Create instance with all classification types including the local one
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: testData.instanceTitle,
                  classifications: testData.classifications.map((classification) => ({
                    classificationNumber: classification.classificationNumber,
                    classificationTypeId: classification.classificationTypeId,
                  })),
                },
              }).then((instance) => {
                instanceId = instance.instanceId;
              });
            });
          },
        );
      });
    });

    after('Delete user and test data', () => {
      cy.getAdminToken();
      if (instanceId) InventoryInstance.deleteInstanceViaApi(instanceId);
      if (localClassificationTypeId) ClassificationIdentifierTypes.deleteViaApi(localClassificationTypeId);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C490935 Copy instance classification number using "Clipboard" icon (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C490935'] },
      () => {
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        cy.stubBrowserPrompt();

        // Step 1: Search for the instance
        InventorySearchAndFilter.searchInstanceByTitle(testData.instanceTitle);
        InventorySearchAndFilter.selectSearchResultItem();
        InventoryInstance.waitLoading();

        // Step 2: Verify classifications are present and test copy functionality
        testData.classifications.forEach((classification) => {
          InventoryInstance.verifyClassificationValueInView(
            classification.typeName,
            classification.classificationNumber,
          );
        });

        // Step 3: Test copying to clipboard for each classification type
        testData.classifications.forEach((classification, index) => {
          InstanceRecordView.verifyCopyClassificationNumberToClipboard(
            classification.classificationNumber,
            index,
          );
        });
      },
    );
  });
});
