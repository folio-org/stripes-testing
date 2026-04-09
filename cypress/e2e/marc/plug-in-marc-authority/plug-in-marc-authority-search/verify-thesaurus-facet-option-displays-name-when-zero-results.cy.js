import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, {
  randomNDigitNumber,
  getRandomLetters,
} from '../../../../support/utils/stringTools';
import { MARC_AUTHORITY_SEARCH_OPTIONS } from '../../../../support/constants';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Search', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = randomNDigitNumber(5);
      const randomLetters = getRandomLetters(15);
      const searchOption = MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD;
      const thesaurusAccordionName = 'Thesaurus';
      const nonExistingQuery = `Non-existing query ${randomPostfix}`;
      const thesaurusName = 'Library of Congress Subject Headings';
      const testData = {
        tag008: '008',
        tag100: '100',
        tag245: '245',
        tag700: '700',
        authorityPrefix: `AT_C366584_MarcAuthority_${randomPostfix}`,
        bibTitle: `AT_C366584_MarcBibInstance_${randomPostfix}`,
      };

      const authData = { prefix: randomLetters, startWithNumber: randomDigits };

      const authority008Values = {
        ...MarcAuthorities.valid008FieldValues,
        'SH Sys': 'a',
      };

      const marcBibFields = [
        { tag: testData.tag008, content: QuickMarcEditor.defaultValid008Values },
        {
          tag: testData.tag245,
          content: `$a ${testData.bibTitle}`,
          indicators: ['1', '1'],
        },
        {
          tag: testData.tag700,
          content: `$a ${testData.authorityPrefix} link target`,
          indicators: ['1', '\\'],
        },
      ];

      const createdAuthorityIds = [];
      let createdBibId;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C366584');

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.then(() => {
            MarcAuthorities.createMarcAuthorityViaAPI(
              authData.prefix,
              authData.startWithNumber,
              [
                {
                  tag: testData.tag100,
                  content: `$a ${testData.authorityPrefix} A`,
                  indicators: ['\\', '\\'],
                },
              ],
              undefined,
              authority008Values,
            ).then((createdRecordId) => {
              createdAuthorityIds.push(createdRecordId);
            });

            MarcAuthorities.createMarcAuthorityViaAPI(
              authData.prefix,
              authData.startWithNumber + 1,
              [
                {
                  tag: testData.tag100,
                  content: `$a ${testData.authorityPrefix} B`,
                  indicators: ['\\', '\\'],
                },
              ],
              undefined,
              authority008Values,
            ).then((createdRecordId) => {
              createdAuthorityIds.push(createdRecordId);
            });

            cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
              (instanceId) => {
                createdBibId = instanceId;
              },
            );
          }).then(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
            InventoryInstances.searchByTitle(createdBibId);
            InventoryInstances.selectInstanceById(createdBibId);
            InventoryInstance.waitLoading();
            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickLinkIcon(testData.tag700);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.switchToSearch();
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdBibId);
        createdAuthorityIds.forEach((id) => {
          MarcAuthority.deleteViaAPI(id, true);
        });
      });

      it(
        'C366584 MARC Authority plug-in | Search: Verify that the "Thesaurus" facet option will display the name of facet option when zero results are returned (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C366584'] },
        () => {
          // Step 1: Click on the "Thesaurus" accordion button
          MarcAuthorities.verifyThesaurusAccordionAndClick();

          // Step 2: Click on the multiselect element titled "Thesaurus"
          MarcAuthorities.checkOptionsWithCountersExistInAccordion(thesaurusAccordionName);
          MarcAuthorities.verifyOptionAvailableMultiselect(thesaurusAccordionName, thesaurusName);

          // Step 3: Click on "Library of Congress Subject Headings" thesaurus option
          MarcAuthorities.chooseThesaurus(thesaurusName);
          MarcAuthorities.checkResultsListRecordsCountGreaterThan(1);
          MarcAuthorities.verifySelectedTextOfThesaurus(thesaurusName);

          // Steps 4-5: Select "Keyword" search option, search for non-existing query
          MarcAuthorities.searchByParameter(searchOption, nonExistingQuery);

          // Step 6: Verify "No results found" message and thesaurus tag still displayed
          MarcAuthorities.verifyEmptySearchResults(nonExistingQuery);
          MarcAuthorities.verifySelectedTextOfThesaurus(thesaurusName);

          // Step 7: Click on the multiselect - verify selected option shown with zero hit count
          MarcAuthorities.verifyMultiSelectOptionNumber(thesaurusAccordionName, thesaurusName, 0);
        },
      );
    });
  });
});
