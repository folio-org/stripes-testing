import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../../support/utils/stringTools';
import {
  MARC_AUTHORITY_SEARCH_OPTIONS,
  DEFAULT_FOLIO_AUTHORITY_FILES,
} from '../../../../support/constants';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Search', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = `422167${randomNDigitNumber(15)}`;
      // Custom source file code
      const customSourceCode = getRandomLetters(20);
      const authoritySourceAccordionName = 'Authority source';
      const searchOption = MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD;

      const SOURCE_FILES = {
        CUSTOM: `AT_C422167_Src_${randomPostfix}`,
        LCNAF: DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
        LCSH: DEFAULT_FOLIO_AUTHORITY_FILES.LC_SUBJECT_HEADINGS,
        NOT_SPECIFIED: 'Not specified',
      };

      const testData = {
        tag100: '100',
        tag245: '245',
        tag700: '700',
        tag008: '008',
        authorityPrefix: `AT_C422167_MarcAuthority_${randomPostfix}`,
        bibTitle: `AT_C422167_MarcBibInstance_${randomPostfix}`,
      };

      // 4 authority records — source file assigned via first arg (001 prefix)
      const authorityRecords = [
        {
          prefix: customSourceCode,
          heading: `${testData.authorityPrefix}_Custom`,
          sourceName: SOURCE_FILES.CUSTOM,
        },
        {
          prefix: 'sh',
          heading: `${testData.authorityPrefix}_LCSH`,
          sourceName: SOURCE_FILES.LCSH,
        },
        {
          prefix: 'n',
          heading: `${testData.authorityPrefix}_LCNAF`,
          sourceName: SOURCE_FILES.LCNAF,
        },
        {
          prefix: '',
          heading: `${testData.authorityPrefix}_NoSource`,
          sourceName: SOURCE_FILES.NOT_SPECIFIED,
        },
      ];

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
      let customSourceFileId;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C422167_');

        // Step 1: Create custom authority source file
        cy.createAuthoritySourceFileViaAPI({
          name: SOURCE_FILES.CUSTOM,
          code: customSourceCode,
          type: 'Subject',
          baseUrl: `http://id.loc.gov/authorities-c422167/${customSourceCode}/`,
        }).then((body) => {
          customSourceFileId = body.id;
          cy.wait(70_000); // wait for source to be processed by scheduled job
        });

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.then(() => {
            // Create 4 authority records — prefix (arg 1) determines source file assignment via 001 field
            authorityRecords.forEach((record, index) => {
              const naturalIdNumbers = index ? randomDigits : '1';
              MarcAuthorities.createMarcAuthorityViaAPI(record.prefix, `${naturalIdNumbers}`, [
                {
                  tag: testData.tag100,
                  content: `$a ${record.heading}`,
                  indicators: ['\\', '\\'],
                },
              ]).then((id) => {
                createdAuthorityIds.push(id);
              });
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
            MarcAuthorities.verifySearchTabIsOpened();
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
        if (customSourceFileId) {
          cy.deleteAuthoritySourceFileViaAPI(customSourceFileId, true);
        }
      });

      it(
        'C422167 API: MARC Authority plug-in | Apply "Authority source" facet not from pre-defined list to the search result list (spitfire)',
        { tags: ['backend', 'extendedPath', 'spitfire', 'C422167'] },
        () => {
          // Steps 7-8: Search for all created authority records
          MarcAuthorities.searchByParameter(searchOption, testData.authorityPrefix);
          authorityRecords.forEach((record) => {
            MarcAuthorities.checkRowByContent(record.heading);
          });

          // Step 8: Verify custom source file option is available and select it
          // Steps 9-10: Click on the custom record and verify the 001 field contains custom source code
          MarcAuthorities.verifyOptionAvailableMultiselect(
            authoritySourceAccordionName,
            SOURCE_FILES.CUSTOM,
          );
          MarcAuthorities.chooseAuthoritySourceOption(SOURCE_FILES.CUSTOM);
          MarcAuthorities.checkSelectedAuthoritySourceInPlugInModal(SOURCE_FILES.CUSTOM);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(`${customSourceCode}1`);
          MarcAuthorities.closeMarcViewPane();
          MarcAuthorities.verifyAllResultsHaveSource([SOURCE_FILES.CUSTOM]);
          MarcAuthorities.checkRowByContent(authorityRecords[0].heading);

          // Step 11: Select pre-defined source (LCNAF) in addition to custom
          MarcAuthorities.chooseAuthoritySourceOption(SOURCE_FILES.LCNAF);
          MarcAuthorities.checkSelectedAuthoritySourceInPlugInModal(SOURCE_FILES.CUSTOM);
          MarcAuthorities.checkSelectedAuthoritySourceInPlugInModal(SOURCE_FILES.LCNAF);
          MarcAuthorities.checkRowByContent(authorityRecords[0].heading);
          MarcAuthorities.checkRowByContent(authorityRecords[2].heading);
          MarcAuthorities.verifyAllResultsHaveSource([SOURCE_FILES.CUSTOM, SOURCE_FILES.LCNAF]);

          // Steps 12-13: Click on LCNAF record and verify 001 field contains 'n' prefix
          MarcAuthorities.selectTitle(authorityRecords[2].heading);
          MarcAuthority.contains(`n${randomDigits}`);
          MarcAuthorities.closeMarcViewPane();

          // Step 14: Select "Not specified" facet option as well
          MarcAuthorities.chooseAuthoritySourceOption(SOURCE_FILES.NOT_SPECIFIED);
          MarcAuthorities.checkSelectedAuthoritySourceInPlugInModal(SOURCE_FILES.CUSTOM);
          MarcAuthorities.checkSelectedAuthoritySourceInPlugInModal(SOURCE_FILES.LCNAF);
          MarcAuthorities.checkSelectedAuthoritySourceInPlugInModal(SOURCE_FILES.NOT_SPECIFIED);
          MarcAuthorities.checkRowByContent(authorityRecords[0].heading);
          MarcAuthorities.checkRowByContent(authorityRecords[2].heading);
          MarcAuthorities.checkRowByContent(authorityRecords[3].heading);
          MarcAuthorities.verifyAllResultsHaveSource([
            SOURCE_FILES.CUSTOM,
            SOURCE_FILES.LCNAF,
            SOURCE_FILES.NOT_SPECIFIED,
          ]);

          // Step 15: Clear authority source facet and use type-ahead to find "LC Subject Headings (LCSH)"
          InventorySearchAndFilter.clearDefaultFilter(authoritySourceAccordionName);
          MarcAuthorities.verifyMultiSelectFilterNumberOfSelectedOptions(
            authoritySourceAccordionName,
            0,
          );
          MarcAuthorities.typeNotFullValueInMultiSelectFilterFieldAndCheck(
            authoritySourceAccordionName,
            'Subject',
            SOURCE_FILES.LCSH,
          );
        },
      );
    });
  });
});
