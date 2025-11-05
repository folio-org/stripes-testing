import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomFourDigitNumber,
} from '../../../../../support/utils/stringTools';
import {
  MARC_AUTHORITY_BROWSE_OPTIONS,
  MARC_AUTHORITY_SEARCH_OPTIONS,
  DEFAULT_FOLIO_AUTHORITY_FILES,
} from '../../../../../support/constants';
import MarcAuthoritiesSearch from '../../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        const randomPostfix = getRandomPostfix();
        const randomLetters = getRandomLetters(15);
        const randomDigits = randomFourDigitNumber();
        const testData = {
          tags: {
            tag008: '008',
            tag010: '010',
            tag100: '100',
            tag110: '110',
            tag111: '111',
            tag130: '130',
            tag150: '150',
            tag151: '151',
            tag655: '655',
            tag245: '245',
          },
          bibTitle: `AT_C380460_MarcBibInstance_${randomPostfix}`,
          authorityHeadingPrefix: `AT_C380460_MarcAuthority_${randomPostfix}`,
          bibField655Content: `$a AT_C380460_Field655_${randomPostfix} $t test $2 fast`,
          browseQuery: `AT_C380460_Field655_${randomPostfix}`,
          browseOption: MARC_AUTHORITY_BROWSE_OPTIONS.GENRE,
          contributorAccordion: 'Contributor',
          errorMessage:
            'You have selected an invalid heading based on the bibliographic field you want controlled. Please revise your selection.',
        };
        const authorityHeadingsRegularSearch = [
          {
            heading: `${testData.authorityHeadingPrefix} 100 Field No t`,
            searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.PERSONAL_NAME,
          },
          {
            heading: `${testData.authorityHeadingPrefix} 100 Field With t`,
            searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.NAME_TITLE,
          },
          {
            heading: `${testData.authorityHeadingPrefix} 110 Field No t`,
            searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.CORPORATE_CONFERENCE_NAME,
          },
          {
            heading: `${testData.authorityHeadingPrefix} 110 Field With t`,
            searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.NAME_TITLE,
          },
          {
            heading: `${testData.authorityHeadingPrefix} 111 Field No t`,
            searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.CORPORATE_CONFERENCE_NAME,
          },
          {
            heading: `${testData.authorityHeadingPrefix} 111 Field With t`,
            searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.NAME_TITLE,
          },
        ];
        const authorityHeadingsSourceSearch = [
          {
            heading: `${testData.authorityHeadingPrefix} 130 Field`,
            source: DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
            searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.UNIFORM_TITLE,
          },
          {
            heading: `${testData.authorityHeadingPrefix} 150 Field`,
            source: DEFAULT_FOLIO_AUTHORITY_FILES.LC_CHILDREN_SUBJECT_HEADINGS,
            searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.SUBJECT,
          },
          {
            heading: `${testData.authorityHeadingPrefix} 151 Field`,
            source: DEFAULT_FOLIO_AUTHORITY_FILES.LC_SUBJECT_HEADINGS,
            searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.GEOGRAPHIC_NAME,
          },
        ];
        const authorityFieldContentsNotDefinedSource = [
          { tag: testData.tags.tag100, content: `$a ${authorityHeadingsRegularSearch[0].heading}` },
          {
            tag: testData.tags.tag100,
            content: `$a ${testData.authorityHeadingPrefix} 100 Field $t With t`,
          },
          { tag: testData.tags.tag110, content: `$a ${authorityHeadingsRegularSearch[2].heading}` },
          {
            tag: testData.tags.tag110,
            content: `$a ${testData.authorityHeadingPrefix} 110 Field $t With t`,
          },
          { tag: testData.tags.tag111, content: `$a ${authorityHeadingsRegularSearch[4].heading}` },
          {
            tag: testData.tags.tag111,
            content: `$a ${testData.authorityHeadingPrefix} 111 Field $t With t`,
          },
        ];
        const authorityFieldContentsDefaultSource = [
          {
            tag: testData.tags.tag130,
            content: `$a ${authorityHeadingsSourceSearch[0].heading}`,
            naturalIdPrefix: 'n',
          },
          {
            tag: testData.tags.tag150,
            content: `$a ${authorityHeadingsSourceSearch[1].heading}`,
            naturalIdPrefix: 'sj',
          },
          {
            tag: testData.tags.tag151,
            content: `$a ${authorityHeadingsSourceSearch[2].heading}`,
            naturalIdPrefix: 'sh',
          },
        ];
        const authData = { prefix: randomLetters, startWithNumber: '1' };
        const marcBibFields = [
          {
            tag: testData.tags.tag008,
            content: QuickMarcEditor.defaultValid008Values,
          },
          {
            tag: testData.tags.tag245,
            content: `$a ${testData.bibTitle}`,
            indicators: ['1', '1'],
          },
          {
            tag: testData.tags.tag655,
            content: testData.bibField655Content,
            indicators: ['1', '\\'],
          },
        ];

        let userData = {};
        const createdInstanceIds = [];
        const createdAuthorityIds = [];

        before(() => {
          cy.getAdminToken();
          // Make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C380460_MarcAuthority');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            cy.then(() => {
              cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
                (instanceId) => {
                  createdInstanceIds.push(instanceId);
                },
              );

              authorityFieldContentsNotDefinedSource.forEach((field, index) => {
                MarcAuthorities.createMarcAuthorityViaAPI(
                  authData.prefix,
                  `${+authData.startWithNumber + index}`,
                  [
                    {
                      tag: field.tag,
                      content: field.content,
                      indicators: ['1', '\\'],
                    },
                  ],
                ).then((createdRecordId) => {
                  createdAuthorityIds.push(createdRecordId);
                });
              });

              authorityFieldContentsDefaultSource.forEach((field, index) => {
                MarcAuthorities.createMarcAuthorityViaAPI(
                  '',
                  `380460${randomDigits}${randomDigits}${index}`,
                  [
                    {
                      tag: field.tag,
                      content: field.content,
                      indicators: ['1', '\\'],
                    },
                    {
                      tag: testData.tags.tag010,
                      content: `$a ${field.naturalIdPrefix}380460${randomDigits}${randomDigits}${index}`,
                      indicators: ['\\', '\\'],
                    },
                  ],
                ).then((createdRecordId) => {
                  createdAuthorityIds.push(createdRecordId);
                });
              });
            }).then(() => {
              cy.waitForAuthRefresh(() => {
                cy.login(userData.username, userData.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                });
              }, 20_000);
            });
          });
        });

        after(() => {
          cy.getAdminToken();
          createdAuthorityIds.forEach((id) => {
            MarcAuthority.deleteViaAPI(id, true);
          });
          createdInstanceIds.forEach((id) => {
            InventoryInstance.deleteInstanceViaApi(id);
          });
          Users.deleteViaApi(userData.userId);
        });

        it(
          'C380460 Link "MARC Bib" field without controlled subfields to "MARC Authority" record. "Authority source file" value is "Not specified" (700 field to 100) (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C380460'] },
          () => {
            InventoryInstances.searchByTitle(createdInstanceIds[0]);
            InventoryInstances.selectInstanceById(createdInstanceIds[0]);
            InventoryInstance.waitLoading();
            InventoryInstance.editMarcBibliographicRecord();

            QuickMarcEditor.clickLinkIconInTagFieldByTag(testData.tags.tag655);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.verifyBrowseTabIsOpened();
            MarcAuthorities.checkSearchQuery(testData.browseQuery);
            MarcAuthoritiesSearch.verifySelectedSearchOption(testData.browseOption);
            MarcAuthorities.switchToSearch();
            MarcAuthorities.verifySearchTabIsOpened();

            authorityHeadingsRegularSearch.forEach((searchData) => {
              MarcAuthorities.searchBy(searchData.searchOption, searchData.heading);
              MarcAuthority.waitLoading();
              MarcAuthority.contains(searchData.heading);
              MarcAuthorities.clickLinkButton();
              QuickMarcEditor.checkCallout(testData.errorMessage);
              QuickMarcEditor.closeAllCallouts();
              InventoryInstance.verifySelectMarcAuthorityModal();
            });

            authorityHeadingsSourceSearch.forEach((searchData) => {
              MarcAuthorities.searchBy(searchData.searchOption, searchData.heading);
              MarcAuthorities.chooseAuthoritySourceOption(searchData.source);
              MarcAuthority.waitLoading();
              MarcAuthority.contains(searchData.heading);
              MarcAuthorities.clickLinkButton();
              QuickMarcEditor.checkCallout(testData.errorMessage);
              QuickMarcEditor.closeAllCallouts();
              InventoryInstance.verifySelectMarcAuthorityModal();
              MarcAuthorities.clickResetAndCheck();
            });
          },
        );
      });
    });
  });
});
