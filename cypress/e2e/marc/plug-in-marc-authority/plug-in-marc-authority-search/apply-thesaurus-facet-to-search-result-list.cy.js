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
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Search', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = randomNDigitNumber(5);
      const randomLetters = getRandomLetters(15);
      const searchOption = MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD;
      const thesaurusAccordionName = 'Thesaurus';
      const testData = {
        tag008: '008',
        tag100: '100',
        tag150: '150',
        tag245: '245',
        tag700: '700',
        authorityPrefix: `AT_C359143_MarcAuthority_${randomPostfix}`,
        bibTitle: `AT_C359143_MarcBibInstance_${randomPostfix}`,
        naturalIdBase: `359143${randomDigits}${randomDigits}`,
        thesaurusA: {
          name: 'Library of Congress Subject Headings',
          code: 'a',
        },
        thesaurusB: {
          name: 'Medical Subject Headings',
          code: 'c',
        },
      };

      const authData = { prefix: randomLetters, startWithNumber: randomDigits };

      const authority008ValuesA = {
        ...MarcAuthorities.valid008FieldValues,
        'SH Sys': testData.thesaurusA.code,
      };
      const authority008ValuesB = {
        ...MarcAuthorities.valid008FieldValues,
        'SH Sys': testData.thesaurusB.code,
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
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C359143');

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.then(() => {
            // Authority record A with thesaurus "Library of Congress Subject Headings" (code a)
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
              authority008ValuesA,
            ).then((createdRecordId) => {
              createdAuthorityIds.push(createdRecordId);
            });

            // Authority record B with thesaurus "Medical Subject Headings" (code c)
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
              authority008ValuesB,
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
        'C359143 MARC Authority plug-in | Apply "Thesaurus" facet to the search result list (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C359143'] },
        () => {
          // Steps 1-3: Search for created authority records by keyword
          MarcAuthorities.searchByParameter(searchOption, testData.authorityPrefix);
          MarcAuthorities.verifyRecordFound(`${testData.authorityPrefix} A`);
          MarcAuthorities.verifyRecordFound(`${testData.authorityPrefix} B`);

          // Step 4: Click on the "Thesaurus" accordion button
          MarcAuthorities.verifyThesaurusAccordionAndClick();

          // Steps 5-7: Click on the multiselect element titled "Thesaurus", verify options
          MarcAuthorities.checkOptionsWithCountersExistInAccordion(thesaurusAccordionName);
          MarcAuthorities.verifyMultiSelectOptionNumber(
            thesaurusAccordionName,
            testData.thesaurusA.name,
            1,
          );
          MarcAuthorities.verifyMultiSelectOptionNumber(
            thesaurusAccordionName,
            testData.thesaurusA.name,
            1,
          );

          // Step 6-7: type ahead search
          MarcAuthorities.typeNotFullValueInMultiSelectFilterFieldAndCheck(
            thesaurusAccordionName,
            'Congress',
            testData.thesaurusA.name,
          );

          // Step 8-10: Click on thesaurus A option. Click on a title and verify 008 field code matches thesaurus A
          MarcAuthorities.chooseThesaurus(testData.thesaurusA.name);
          MarcAuthority.contains(`${testData.tag008}\t.{11}${testData.thesaurusA.code}`, {
            regexp: true,
          });
          MarcAuthorities.closeMarcViewPane();
          MarcAuthorities.verifyRecordFound(`${testData.authorityPrefix} B`, false);
          MarcAuthorities.verifyRecordFound(`${testData.authorityPrefix} A`);

          // Step 11: Select second thesaurus option B
          MarcAuthorities.chooseThesaurus(testData.thesaurusB.name);
          MarcAuthorities.verifyRecordFound(`${testData.authorityPrefix} B`);
          MarcAuthorities.verifyRecordFound(`${testData.authorityPrefix} A`);

          // Steps 12-13: Click on a title and verify 008 field code matches one of the selected thesaurus
          MarcAuthorities.selectTitle(`${testData.authorityPrefix} B`);
          MarcAuthority.contains(`${testData.tag008}\t.{11}${testData.thesaurusB.code}`, {
            regexp: true,
          });

          // Step 14: Remove thesaurus B from multiselect
          MarcAuthorities.closeMarcViewPane();
          MarcAuthorities.chooseThesaurus(testData.thesaurusB.name);
          MarcAuthority.waitLoading();
          MarcAuthorities.closeMarcViewPane();
          MarcAuthorities.verifyRecordFound(`${testData.authorityPrefix} B`, false);
          MarcAuthorities.verifyRecordFound(`${testData.authorityPrefix} A`);
          MarcAuthorities.verifySelectedTextOfThesaurus(testData.thesaurusA.name);

          // Step 15: Cancel thesaurus facet by clicking "X" icon next to the Thesaurus accordion
          InventorySearchAndFilter.clearDefaultFilter(thesaurusAccordionName);
          MarcAuthorities.verifyMultiSelectFilterNumberOfSelectedOptions(thesaurusAccordionName, 0);
          MarcAuthorities.verifyRecordFound(`${testData.authorityPrefix} A`);
          MarcAuthorities.verifyRecordFound(`${testData.authorityPrefix} B`);

          // Step 16: Click "Reset all" button
          MarcAuthorities.clickResetAndCheck(testData.authorityPrefix);
        },
      );
    });
  });
});
