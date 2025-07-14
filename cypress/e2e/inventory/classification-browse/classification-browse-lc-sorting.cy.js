import { Permissions } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseClassifications from '../../../support/fragments/inventory/search/browseClassifications';
import ClassificationBrowse, {
  defaultClassificationBrowseIdsAlgorithms,
} from '../../../support/fragments/settings/inventory/instances/classificationBrowse';
import {
  CLASSIFICATION_IDENTIFIER_TYPES,
  BROWSE_CLASSIFICATION_OPTIONS,
} from '../../../support/constants';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';

const randomPostfix = getRandomPostfix();
const randomLetters = getRandomLetters(7);
const instanceTitlePrefix = `AT_C468246_FolioInstance_${randomPostfix}`;
const lcBrowseId = defaultClassificationBrowseIdsAlgorithms[2].id;
const lcBrowseAlgorithm = defaultClassificationBrowseIdsAlgorithms[2].algorithm;

// The LC classification numbers to test, in the required sort order
const lcClassifications = [
  `${randomLetters}A1 B2 .C33`,
  `${randomLetters}A1 B2 C33`,
  `${randomLetters}A1 B2.C33`,
  `${randomLetters}A1 B2C33`,
  `${randomLetters}AB9 L3`,
  `${randomLetters}BF199`,
  `${randomLetters}BF199.`,
  `${randomLetters}BF199.A1J7`,
  `${randomLetters}G3841 .C2 1935 .M3`,
  `${randomLetters}HC241.25 .I4 D47`,
  `${randomLetters}HD 38.25.F8 R87 1989`,
  `${randomLetters}HD38.25.F8 R87 1989`,
  `${randomLetters}HE5.215 .N9/PT.A`,
  `${randomLetters}HF 5549.5.T7 B294 1992`,
  `${randomLetters}LD6329 1903 35TH`,
  `${randomLetters}LD6353 1886`,
  `${randomLetters}M1 .L33`,
  `${randomLetters}M1 L33`,
  `${randomLetters}M5 .L`,
  `${randomLetters}M5 L3 1902`,
  `${randomLetters}M5 L3 1902 V.2`,
  `${randomLetters}M5 L3 1902 V2`,
  `${randomLetters}M5 .L3 1902 V2 TANEYTOWN`,
  `${randomLetters}M211 .M93 BMW240`,
];

let user;
let instanceTypeId;
const createdInstanceIds = [];

describe('Inventory', () => {
  describe('Instance classification browse', () => {
    before('Create user, set LC browse option, and create instances', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C468246_');
      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((createdUser) => {
        user = createdUser;
        cy.getInstanceTypes({ limit: 1 }).then((types) => {
          instanceTypeId = types[0].id;
          // Create instances for each LC classification number
          lcClassifications.forEach((classificationNumber, idx) => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: `${instanceTitlePrefix}_${idx + 1}`,
                classifications: [
                  {
                    classificationTypeId: CLASSIFICATION_IDENTIFIER_TYPES.LC,
                    classificationNumber,
                  },
                ],
              },
            }).then((instance) => {
              createdInstanceIds.push(instance.instanceId);
            });
          });

          // Set LC browse option to LC, LC(local), NLM
          ClassificationBrowse.updateIdentifierTypesAPI(lcBrowseId, lcBrowseAlgorithm, [
            CLASSIFICATION_IDENTIFIER_TYPES.LC,
            CLASSIFICATION_IDENTIFIER_TYPES.LC_LOCAL,
            CLASSIFICATION_IDENTIFIER_TYPES.NLM,
          ]);
        });
      });
    });

    after('Delete user and instances, reset LC browse option', () => {
      cy.getAdminToken();
      ClassificationBrowse.updateIdentifierTypesAPI(lcBrowseId, lcBrowseAlgorithm, []);
      Users.deleteViaApi(user.userId);
      createdInstanceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C468246 Check LC sorting during browsing for Classification using Library of Congress classification option (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'nonParallel', 'C468246'] },
      () => {
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.switchToBrowseTab();
        lcClassifications.forEach((classificationNumber) => {
          BrowseClassifications.waitForClassificationNumberToAppear(
            classificationNumber,
            lcBrowseId,
          );
        });

        // For each LC classification, search and verify sorting and highlighting
        lcClassifications.forEach((classificationNumber, idx) => {
          InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
            BROWSE_CLASSIFICATION_OPTIONS.LIBRARY_OF_CONGRESS,
          );
          InventorySearchAndFilter.checkBrowseOptionSelected(
            BROWSE_CLASSIFICATION_OPTIONS.LIBRARY_OF_CONGRESS,
          );
          InventorySearchAndFilter.browseSearch(classificationNumber);
          BrowseClassifications.verifySearchResultsTable();
          // The exact match should be highlighted
          BrowseClassifications.verifyValueInResultTableIsHighlighted(classificationNumber);
          // Get all values from the result list and check the order
          BrowseCallNumber.resultRowsIsInRequiredOder(lcClassifications.slice(idx));
          InventorySearchAndFilter.clickResetAllButton();
          BrowseClassifications.verifySearchResultsTable(false);
        });
      },
    );
  });
});
