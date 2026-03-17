import { Permissions } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseClassifications from '../../../support/fragments/inventory/search/browseClassifications';
import ClassificationBrowse, {
  defaultClassificationBrowseIdsAlgorithms,
  classificationIdentifierTypesDropdownDefaultOptions as optionNames,
} from '../../../support/fragments/settings/inventory/instances/classificationBrowse';
import ClassificationIdentifierTypes from '../../../support/fragments/settings/inventory/instances/classificationIdentifierTypes';
import {
  CLASSIFICATION_IDENTIFIER_TYPES,
  BROWSE_CLASSIFICATION_OPTIONS,
} from '../../../support/constants';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';

const randomPostfix = getRandomPostfix();
const randomLetters = getRandomLetters(7);
// Test data for all classification types
const classificationTestData = [
  {
    name: optionNames[0],
    id: CLASSIFICATION_IDENTIFIER_TYPES.ADDITIONAL_DEWEY,
    value: `${randomLetters}388.14`,
  },
  {
    name: optionNames[1],
    id: CLASSIFICATION_IDENTIFIER_TYPES.CANADIAN_CLASSIFICATION,
    value: `${randomLetters}K347.9445`,
  },
  {
    name: optionNames[2],
    id: CLASSIFICATION_IDENTIFIER_TYPES.DEWEY,
    value: `${randomLetters}839.83`,
  },
  {
    name: optionNames[3],
    id: CLASSIFICATION_IDENTIFIER_TYPES.GDC,
    value: `${randomLetters}A 13.28:F 61/2/982 Glacier`,
  },
  {
    name: optionNames[4],
    id: CLASSIFICATION_IDENTIFIER_TYPES.LC,
    value: `${randomLetters}BJ1533.C5`,
  },
  {
    name: optionNames[5],
    id: CLASSIFICATION_IDENTIFIER_TYPES.LC_LOCAL,
    value: `${randomLetters}JK608`,
  },
  {
    name: optionNames[6],
    id: CLASSIFICATION_IDENTIFIER_TYPES.NATIONAL_AGRICULTURAL_LIBRARY,
    value: `${randomLetters}TRANSL17827`,
  },
  {
    name: optionNames[7],
    id: CLASSIFICATION_IDENTIFIER_TYPES.NLM,
    value: `${randomLetters}N972a 1968`,
  },
  {
    name: optionNames[8],
    id: CLASSIFICATION_IDENTIFIER_TYPES.SUDOC,
    value: `${randomLetters}L33s:Oc1/2/996`,
  },
  {
    name: optionNames[9],
    id: CLASSIFICATION_IDENTIFIER_TYPES.UDC,
    value: `${randomLetters}821.113.4-15`,
  },
];

const localClassificationTypeName = `AT_C468179_CNType_${randomPostfix}`;
const localClassificationValue = `${randomLetters}_local_C468179`;
const instanceTitle = `AT_C468179_FolioInstance_${randomPostfix}`;
const querySearchOption = 'Query search';
const deweyBrowseId = defaultClassificationBrowseIdsAlgorithms[1].id;
const deweyBrowseAlgorithm = defaultClassificationBrowseIdsAlgorithms[1].algorithm;

let user;
let instanceTypeId;
let localClassificationTypeId;

// Utility to create the instance with all classification types
function createInstanceWithAllClassifications() {
  return cy.getInstanceTypes({ limit: 1 }).then((result) => {
    instanceTypeId = result[0].id;
    // Create the Local classification identifier type
    return ClassificationIdentifierTypes.createViaApi({
      name: localClassificationTypeName,
      source: 'local',
    }).then((response) => {
      localClassificationTypeId = response.body.id;
      // Compose all classifications
      const allClassifications = [
        ...classificationTestData.map((c) => ({
          classificationTypeId: c.id,
          classificationNumber: c.value,
        })),
        {
          classificationTypeId: localClassificationTypeId,
          classificationNumber: localClassificationValue,
        },
      ];
      // Create the instance
      return InventoryInstances.createFolioInstanceViaApi({
        instance: {
          instanceTypeId,
          title: instanceTitle,
          classifications: allClassifications,
        },
      });
    });
  });
}

describe('Inventory', () => {
  describe('Instance classification browse', () => {
    before('Create user, data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C468179_');
      cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
        .then((createdUser) => {
          user = createdUser;
          return createInstanceWithAllClassifications();
        })
        .then(() => {
          // Set Dewey Decimal classification browse to only Dewey
          ClassificationBrowse.getIdentifierTypesForCertainBrowseAPI(deweyBrowseId).then(() => {
            ClassificationBrowse.updateIdentifierTypesAPI(deweyBrowseId, deweyBrowseAlgorithm, [
              CLASSIFICATION_IDENTIFIER_TYPES.DEWEY,
            ]);
          });
        });
    });

    after('Delete user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C468179_');
      if (localClassificationTypeId) {
        ClassificationIdentifierTypes.deleteViaApi(localClassificationTypeId);
      }
      // Reset Dewey browse option to default
      ClassificationBrowse.updateIdentifierTypesAPI(deweyBrowseId, deweyBrowseAlgorithm, []);
    });

    it(
      'C468179 Browse for classifications of Instance which has each classification type using "Dewey Decimal classification" browse option (spitfire)',
      { tags: ['criticalPathFlaky', 'spitfire', 'nonParallel', 'C468179'] },
      () => {
        cy.waitForAuthRefresh(() => {
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          cy.reload();
          InventoryInstances.waitContentLoading();
        }, 20_000);
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
          BROWSE_CLASSIFICATION_OPTIONS.DEWEY_DECIMAL,
        );
        InventorySearchAndFilter.checkBrowseOptionSelected(
          BROWSE_CLASSIFICATION_OPTIONS.DEWEY_DECIMAL,
        );
        BrowseClassifications.waitForClassificationNumberToAppear(
          classificationTestData[2].value,
          deweyBrowseId,
          true,
        );

        // Step 1: Additional Dewey
        InventorySearchAndFilter.browseSearch(classificationTestData[0].value);
        BrowseCallNumber.checkNotExistingCallNumber(classificationTestData[0].value);
        BrowseCallNumber.checkValuePresentInResults(classificationTestData[0].value, false);
        InventorySearchAndFilter.clickResetAllButton();
        InventorySearchAndFilter.checkBrowseResultListCallNumbersExists(false);

        // Step 2: Canadian Classification
        InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
          BROWSE_CLASSIFICATION_OPTIONS.DEWEY_DECIMAL,
        );
        InventorySearchAndFilter.checkBrowseOptionSelected(
          BROWSE_CLASSIFICATION_OPTIONS.DEWEY_DECIMAL,
        );
        InventorySearchAndFilter.browseSearch(classificationTestData[1].value);
        BrowseCallNumber.checkNotExistingCallNumber(classificationTestData[1].value);
        BrowseCallNumber.checkValuePresentInResults(classificationTestData[1].value, false);
        InventorySearchAndFilter.clickResetAllButton();
        InventorySearchAndFilter.checkBrowseResultListCallNumbersExists(false);

        // Step 3: Dewey (should find exact match)
        InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
          BROWSE_CLASSIFICATION_OPTIONS.DEWEY_DECIMAL,
        );
        InventorySearchAndFilter.checkBrowseOptionSelected(
          BROWSE_CLASSIFICATION_OPTIONS.DEWEY_DECIMAL,
        );
        InventorySearchAndFilter.browseSearch(classificationTestData[2].value);
        BrowseClassifications.verifyValueInResultTableIsHighlighted(
          classificationTestData[2].value,
        );
        BrowseClassifications.checkNumberOfTitlesInRow(classificationTestData[2].value, '1');

        // Step 4: Click on exact match result
        BrowseCallNumber.clickOnResult(classificationTestData[2].value);
        InventorySearchAndFilter.verifySearchOptionAndQuery(
          querySearchOption,
          `classifications.classificationNumber=="${classificationTestData[2].value}"`,
        );
        InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitle);
        InventorySearchAndFilter.verifyNumberOfSearchResults(1);
        InventorySearchAndFilter.switchToBrowseTab();
        BrowseClassifications.verifyValueInResultTableIsHighlighted(
          classificationTestData[2].value,
        );
        BrowseClassifications.checkNumberOfTitlesInRow(classificationTestData[2].value, '1');

        // Steps 6-13: All other types should NOT be found
        [...classificationTestData.slice(3).map((c) => c.value), localClassificationValue].forEach(
          (query) => {
            InventorySearchAndFilter.clickResetAllButton();
            InventorySearchAndFilter.checkBrowseResultListCallNumbersExists(false);
            InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
              BROWSE_CLASSIFICATION_OPTIONS.DEWEY_DECIMAL,
            );
            InventorySearchAndFilter.checkBrowseOptionSelected(
              BROWSE_CLASSIFICATION_OPTIONS.DEWEY_DECIMAL,
            );
            InventorySearchAndFilter.browseSearch(query);
            BrowseCallNumber.checkNotExistingCallNumber(query);
            BrowseCallNumber.checkValuePresentInResults(query, false);
          },
        );
      },
    );
  });
});
