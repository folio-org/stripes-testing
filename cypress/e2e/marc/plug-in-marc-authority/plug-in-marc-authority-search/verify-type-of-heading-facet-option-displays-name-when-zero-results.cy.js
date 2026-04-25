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
      const searchOption = MARC_AUTHORITY_SEARCH_OPTIONS.NAME_TITLE;
      const typeOfHeadingAccordionName = 'Type of heading';
      const nonExistingQuery = `Non-existing query ${randomPostfix}`;
      const personalNameHeading = 'Personal Name';
      const testData = {
        tag008: '008',
        tag100: '100',
        tag110: '110',
        tag245: '245',
        tag700: '700',
        authorityPrefix: `AT_C366585_MarcAuthority_${randomPostfix}`,
        bibTitle: `AT_C366585_MarcBibInstance_${randomPostfix}`,
      };

      const authData = { prefix: randomLetters, startWithNumber: randomDigits };

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
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C366585');

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.then(() => {
            // Record 1: Personal name
            MarcAuthorities.createMarcAuthorityViaAPI(authData.prefix, authData.startWithNumber, [
              {
                tag: testData.tag100,
                content: `$a ${testData.authorityPrefix} A`,
                indicators: ['\\', '\\'],
              },
            ]).then((createdRecordId) => {
              createdAuthorityIds.push(createdRecordId);
            });

            // Record 2: Personal name
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
        'C366585 MARC Authority plug-in | Search: Verify that the "Type of heading" facet option will display the name of facet option when zero results are returned (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C366585'] },
        () => {
          // Step 1: Click on the "Type of heading" accordion button
          MarcAuthorities.verifyTypeOfHeadingAccordionAndClick();

          // Step 2: Click on the multiselect element titled "Type of heading"
          MarcAuthorities.checkOptionsWithCountersExistInAccordion(typeOfHeadingAccordionName);
          MarcAuthorities.verifyOptionAvailableMultiselect(
            typeOfHeadingAccordionName,
            personalNameHeading,
          );

          // Step 3: Click on "Personal name" type of heading option
          MarcAuthorities.chooseTypeOfHeading(personalNameHeading);
          MarcAuthorities.checkResultsListRecordsCountGreaterThan(1);
          MarcAuthorities.verifySelectedTextOfHeadingType(personalNameHeading);

          // Steps 4-5: Select "Name-title" search option, search for non-existing query
          MarcAuthorities.searchByParameter(searchOption, nonExistingQuery);

          // Step 6: Verify "No results found" message and type of heading tag still displayed
          MarcAuthorities.verifyEmptySearchResults(nonExistingQuery);
          MarcAuthorities.verifySelectedTextOfHeadingType(personalNameHeading);

          // Step 7: Click on the multiselect - verify selected option shown with zero hit count
          MarcAuthorities.verifyMultiSelectOptionNumber(
            typeOfHeadingAccordionName,
            personalNameHeading,
            0,
          );
        },
      );
    });
  });
});
