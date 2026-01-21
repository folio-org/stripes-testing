import { Permissions } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
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
const randomDigits = randomFourDigitNumber();
const instanceTitlePrefix = `AT_C468241_FolioInstance_${randomPostfix}`;
const deweyBrowseId = defaultClassificationBrowseIdsAlgorithms[1].id;
const deweyBrowseAlgorithm = defaultClassificationBrowseIdsAlgorithms[1].algorithm;

// The Dewey classification numbers to test, in the required sort order
const deweyClassifications = [
  `468241${randomDigits}1 .I39`,
  `468241${randomDigits}1.23 .I39`,
  `468241${randomDigits}11 .I39`,
  `468241${randomDigits}11.34 .I39`,
  `468241${randomDigits}11.34567 .I39`,
  `468241${randomDigits}111 .I39`,
  `468241${randomDigits}111 I39`,
  `468241${randomDigits}111Q39`,
  `468241${randomDigits}111.12 .I39`,
  `468241${randomDigits}111.123 I39`,
  `468241${randomDigits}111.134Q39`,
  `468241${randomDigits}322.44 .F816 V.1 1974`,
  `468241${randomDigits}322.45 .R513 1957`,
  `468241${randomDigits}323 .A512RE NO.23-28`,
  `468241${randomDigits}323 .A778 ED.2`,
  `468241${randomDigits}323.09 .K43 V.1`,
  `468241${randomDigits}324.54 .I39 F`,
  `468241${randomDigits}324.548 .C425R`,
  `468241${randomDigits}324.6 .A75CUA`,
];

let user;
let instanceTypeId;
const createdInstanceIds = [];

describe('Inventory', () => {
  describe('Instance classification browse', () => {
    before('Create user, set Dewey browse option, and create instances', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C468241_');
      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((createdUser) => {
        user = createdUser;
        cy.getInstanceTypes({ limit: 1 }).then((types) => {
          instanceTypeId = types[0].id;
        });
      });
      cy.then(() => {
        deweyClassifications.forEach((classificationNumber, idx) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId,
              title: `${instanceTitlePrefix}_${idx + 1}`,
              classifications: [
                {
                  classificationTypeId: CLASSIFICATION_IDENTIFIER_TYPES.DEWEY,
                  classificationNumber,
                },
              ],
            },
          }).then((instance) => {
            createdInstanceIds.push(instance.instanceId);
          });
        });
      });

      cy.then(() => {
        ClassificationBrowse.updateIdentifierTypesAPI(deweyBrowseId, deweyBrowseAlgorithm, [
          CLASSIFICATION_IDENTIFIER_TYPES.DEWEY,
          CLASSIFICATION_IDENTIFIER_TYPES.ADDITIONAL_DEWEY,
          CLASSIFICATION_IDENTIFIER_TYPES.LC,
        ]);
      });
    });

    after('Delete user and instances, reset Dewey browse option', () => {
      cy.getAdminToken();
      ClassificationBrowse.updateIdentifierTypesAPI(deweyBrowseId, deweyBrowseAlgorithm, []);
      Users.deleteViaApi(user.userId);
      createdInstanceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C468241 Check Dewey sorting during browsing for Classification using Dewey Decimal classification option (spitfire)',
      { tags: ['criticalPathFlaky', 'spitfire', 'nonParallel', 'C468241'] },
      () => {
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.switchToBrowseTab();
        deweyClassifications.forEach((classificationNumber) => {
          BrowseClassifications.waitForClassificationNumberToAppear(
            classificationNumber,
            deweyBrowseId,
          );
        });

        // For each Dewey classification, search and verify sorting and highlighting
        deweyClassifications.forEach((classificationNumber, idx) => {
          InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
            BROWSE_CLASSIFICATION_OPTIONS.DEWEY_DECIMAL,
          );
          InventorySearchAndFilter.checkBrowseOptionSelected(
            BROWSE_CLASSIFICATION_OPTIONS.DEWEY_DECIMAL,
          );
          cy.ifConsortia(true, () => {
            InventorySearchAndFilter.toggleAccordionByName('Shared');
            InventorySearchAndFilter.selectOptionInExpandedFilter('Shared', 'No');
            InventorySearchAndFilter.verifyBrowseResultListExists();
          });
          InventorySearchAndFilter.browseSearch(classificationNumber);
          BrowseClassifications.verifySearchResultsTable();
          // The exact match should be highlighted
          BrowseClassifications.verifyValueInResultTableIsHighlighted(classificationNumber);
          // Get all values from the result list and check the order
          BrowseCallNumber.resultRowsIsInRequiredOder(deweyClassifications.slice(idx));
          InventorySearchAndFilter.clickResetAllButton();
          BrowseClassifications.verifySearchResultsTable(false);
        });
      },
    );
  });
});
