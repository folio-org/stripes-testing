import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Browse', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = randomNDigitNumber(5);
      const authoritySourceAccordionName = 'Authority source';
      const browseOption = 'Subject';
      const testData = {
        tag008: '008',
        tag150: '150',
        tag245: '245',
        tag650: '650',
        authorityPrefix: `AT_C422169_${randomPostfix}`,
        bibTitle: `AT_C422169_MarcBibInstance_${randomPostfix}`,
      };

      const authData = { startWithNumber: randomDigits };

      // Authority source file options from the table
      const sourceFiles = {
        lcChildrens: "LC Children's Subject Headings",
        lcsh: 'LC Subject Headings (LCSH)',
      };

      // Authority records: 1 per source file
      // sj → LC Children's Subject Headings (010 $a)
      // sh → LC Subject Headings (LCSH) (010 $a)
      const authorityRecords = [
        {
          sourcePrefix: 'sj',
          sourceFile: sourceFiles.lcChildrens,
          heading: `${testData.authorityPrefix} Children 1`,
          tag: testData.tag150,
          // sj goes in 010 $a, first arg is empty
          apiPrefix: '',
          field010: true,
        },
        {
          sourcePrefix: 'sj',
          sourceFile: sourceFiles.lcChildrens,
          heading: `${testData.authorityPrefix} Children 2`,
          tag: testData.tag150,
          // sj goes in 010 $a, first arg is empty
          apiPrefix: '',
          field010: true,
        },
        {
          sourcePrefix: 'sh',
          sourceFile: sourceFiles.lcsh,
          heading: `${testData.authorityPrefix} Subject 1`,
          tag: testData.tag150,
          apiPrefix: '',
          field010: true,
        },
        {
          sourcePrefix: 'sh',
          sourceFile: sourceFiles.lcsh,
          heading: `${testData.authorityPrefix} Subject 2`,
          tag: testData.tag150,
          apiPrefix: '',
          field010: true,
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
          tag: testData.tag650,
          content: `$a ${testData.authorityPrefix} link target`,
          indicators: ['1', '\\'],
        },
      ];

      const createdAuthorityIds = [];
      let createdBibId;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C422169');

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.then(() => {
            authorityRecords.forEach((record, index) => {
              const fields = [
                {
                  tag: record.tag,
                  content: `$a ${record.heading}`,
                  indicators: ['\\', '\\'],
                },
              ];
              // Add 010 $a with source prefix for non-fst records
              if (record.field010) {
                fields.push({
                  tag: '010',
                  content: `$a ${record.sourcePrefix}${authData.startWithNumber}${index}`,
                  indicators: ['\\', '\\'],
                });
              }
              MarcAuthorities.createMarcAuthorityViaAPI(
                record.apiPrefix,
                `${authData.startWithNumber}${index}`,
                fields,
              ).then((createdRecordId) => {
                createdAuthorityIds.push(createdRecordId);
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
            InventoryInstance.verifyAndClickLinkIcon(testData.tag650);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.switchToBrowse();
            MarcAuthorities.verifyBrowseTabIsOpened();
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
        'C422169 MARC Authority plug-in | Apply "Authority source" facet to the browse result list (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C422169'] },
        () => {
          // Steps 1-3: Browse by Subject
          MarcAuthorityBrowse.checkResultWithNoValue(`${testData.authorityPrefix} link target`);
          MarcAuthorityBrowse.clickResetAllAndCheck();
          MarcAuthorities.searchByParameter(browseOption, testData.authorityPrefix);
          MarcAuthorities.verifyRecordFound(authorityRecords[0].heading);
          MarcAuthorities.verifyRecordFound(authorityRecords[2].heading);

          // Step 4: Click on the "Authority source" multiselect
          InventorySearchAndFilter.verifyAccordionByNameExpanded(authoritySourceAccordionName);
          Object.values(sourceFiles).forEach((file) => {
            MarcAuthorities.verifyOptionAvailableMultiselect(authoritySourceAccordionName, file);
          });

          // Step 5: Type ahead search for "Children's"
          MarcAuthorities.typeNotFullValueInMultiSelectFilterFieldAndCheck(
            authoritySourceAccordionName,
            "Children's",
            sourceFiles.lcChildrens,
          );

          // Step 6: Select "LC Children's Subject Headings"
          MarcAuthorities.chooseAuthoritySourceOption(sourceFiles.lcChildrens);
          MarcAuthorities.verifyAllResultsHaveSource([sourceFiles.lcChildrens]);

          // Step 7: Collapse "Authority source" accordion
          MarcAuthorities.clickAuthoritySourceAccordion();
          MarcAuthorities.verifyAuthoritySourceAccordionCollapsed();

          // Step 8: Expand "Authority source" accordion
          MarcAuthorities.clickAuthoritySourceAccordion();
          MarcAuthorities.checkSelectedAuthoritySourceInPlugInModal(sourceFiles.lcChildrens);

          // Steps 9-10: Click on the highlighted heading and verify 010 $a prefix matches "sj"
          MarcAuthorities.selectTitle(authorityRecords[0].heading);
          MarcAuthority.contains('010\t   \t$a sj');
          MarcAuthorities.closeMarcViewPane();

          // Step 11: Select "LC Subject Headings (LCSH)" as second facet option
          MarcAuthorities.chooseAuthoritySourceOption(sourceFiles.lcsh);
          MarcAuthorities.verifyRecordFound(authorityRecords[0].heading);
          MarcAuthorities.verifyRecordFound(authorityRecords[2].heading);
          MarcAuthorities.verifyAllResultsHaveSource([sourceFiles.lcChildrens, sourceFiles.lcsh]);

          // Steps 12-13: Update search query to second authority heading and search
          MarcAuthorities.searchByParameter(browseOption, `${testData.authorityPrefix} Children`);

          // Steps 14-15: Click on the highlighted heading and verify 010 $a prefix matches "sh"
          MarcAuthorities.selectTitle(authorityRecords[2].heading);
          MarcAuthority.contains('010\t   \t$a sh');

          // Step 16: Remove "LC Children's Subject Headings" from multiselect
          MarcAuthorities.removeAuthoritySourceOption(sourceFiles.lcChildrens);
          MarcAuthorityBrowse.checkResultWithNoValue(`${testData.authorityPrefix} Children`);
          MarcAuthorities.verifyRecordFound(authorityRecords[0].heading, false);

          // Step 17: Cancel the applied "Authority source" facet
          InventorySearchAndFilter.clearDefaultFilter(authoritySourceAccordionName);
          MarcAuthorities.verifyEmptyAuthorityFieldInPlugin();
          MarcAuthorities.verifyRecordFound(authorityRecords[0].heading);
          MarcAuthorities.verifyRecordFound(authorityRecords[2].heading);
        },
      );
    });
  });
});
