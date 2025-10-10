import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomFourDigitNumber,
} from '../../../../support/utils/stringTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import {
  MARC_AUTHORITY_SEARCH_OPTIONS,
  ADVANCED_SEARCH_MODIFIERS,
  DEFAULT_FOLIO_AUTHORITY_FILES,
} from '../../../../support/constants';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import { including } from '../../../../../interactors';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const randomPostfix = getRandomPostfix();
      const lccnPostfix = `476803${randomFourDigitNumber()}${randomFourDigitNumber()}`;
      const testData = {
        authorityHeading: `AT_C476803_MarcAuthority_${randomPostfix}`,
        advSearchOption: MARC_AUTHORITY_SEARCH_OPTIONS.ADVANCED_SEARCH,
        keywordSearchOption: MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
        lccnSearchOption: MARC_AUTHORITY_SEARCH_OPTIONS.LCCN,
        exactPhraseModifier: ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
        tag110: '110',
        tag010: '010',
        lccnNumbers: [
          `2017052862${lccnPostfix}`,
          `n  97021259${lccnPostfix}`,
          `n  12397021259${lccnPostfix}`,
          `n  970212591${lccnPostfix}`,
          `sh  3129702125916${lccnPostfix}`,
        ],
        canceledLccnNumbers: [`n  2015061084${lccnPostfix}`, `n79066095${lccnPostfix}`],
        authoritySourceFile: DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
      };

      const searchData = [
        { fieldContent: '$a', expectedResultIndexes: [] },
        { fieldContent: `$a ${testData.lccnNumbers[0]}`, expectedResultIndexes: [1] },
        {
          fieldContent: `$a ${testData.lccnNumbers[0]} $z ${testData.canceledLccnNumbers[0]}`,
          expectedResultIndexes: [1, testData.lccnNumbers.length + 1],
        },
        {
          fieldContent: `$a ${testData.lccnNumbers[0]} $a ${testData.lccnNumbers[1]} $a ${testData.lccnNumbers[2]} $z ${testData.canceledLccnNumbers[0]} $z ${testData.canceledLccnNumbers[1]}`,
          expectedResultIndexes: [
            1,
            2,
            3,
            testData.lccnNumbers.length + 1,
            testData.lccnNumbers.length + 2,
          ],
        },
        {
          fieldContent: `$a ${testData.lccnNumbers[0]} $a ${testData.lccnNumbers[1]} $a ${testData.lccnNumbers[2]} $a ${testData.lccnNumbers[3]} $z ${testData.canceledLccnNumbers[0]} $z ${testData.canceledLccnNumbers[1]}`,
          expectedResultIndexes: [
            1,
            2,
            3,
            4,
            testData.lccnNumbers.length + 1,
            testData.lccnNumbers.length + 2,
          ],
        },
        {
          fieldContent: `$a ${testData.lccnNumbers[0]} $a ${testData.lccnNumbers[1]} $a ${testData.lccnNumbers[2]} $a ${testData.lccnNumbers[3]} $a ${testData.lccnNumbers[4]} $z ${testData.canceledLccnNumbers[0]} $z ${testData.canceledLccnNumbers[1]}`,
          expectedResultIndexes: [1, 2, 3, 4, 5, testData.lccnNumbers.length + 1],
        },
      ];

      const authData = {
        prefix: getRandomLetters(15),
        startWithNumber: '1',
      };

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C476803_MarcAuthority');
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.then(() => {
            [...testData.lccnNumbers, ...testData.canceledLccnNumbers].forEach((lccn, index) => {
              const authorityFields = [
                {
                  tag: testData.tag110,
                  content: `$a ${testData.authorityHeading} ${index + 1}`,
                  indicators: ['\\', '\\'],
                },
                {
                  tag: testData.tag010,
                  content: index < testData.lccnNumbers.length ? `$a ${lccn}` : `$z ${lccn}`,
                  indicators: ['\\', '\\'],
                },
              ];
              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                `${+authData.startWithNumber + index}`,
                authorityFields,
              );
            });
          }).then(() => {
            MarcAuthorities.setAuthoritySourceFileActivityViaAPI(testData.authoritySourceFile);

            cy.waitForAuthRefresh(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
            }, 20_000);
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(testData.authorityHeading);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C476803 Run search for "MARC authority" records by "010" field values from "Create a new MARC authority record" window (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C476803'] },
        () => {
          function goToCreateAuth(field010Content) {
            MarcAuthorities.clickActionsAndNewAuthorityButton();
            MarcAuthority.setValid008DropdownValues();
            MarcAuthority.selectSourceFile(testData.authoritySourceFile);
            QuickMarcEditor.addNewField(testData.tag110, `$a ${testData.authorityHeading} Test`, 3);
            QuickMarcEditor.addNewField(testData.tag010, field010Content, 4);
          }

          searchData.forEach((search, index) => {
            goToCreateAuth(search.fieldContent);
            QuickMarcEditor.checkSearchButtonShownIn010Field({ checkHoverText: true });
            QuickMarcEditor.clickSearchButtonIn010Field();
            MarcAuthoritiesSearch.verifySelectedSearchOption(testData.advSearchOption);
            if (!index) {
              MarcAuthorities.checkSearchQuery('');
              MarcAuthoritiesSearch.verifySearchPaneExpanded(true);
            } else {
              MarcAuthorities.checkSearchQuery(including('lccn exactPhrase'));
              MarcAuthorities.checkResultList(
                search.expectedResultIndexes.map(
                  (recordIndex) => `${testData.authorityHeading} ${recordIndex}`,
                ),
              );
            }
            if (index > 2) {
              MarcAuthorities.clickAdvancedSearchButton();
              const lccnNumbers = search.fieldContent
                .match(/\$[az]\s+([^$]*)/g)
                .map((match) => match.replace(/\$[az]\s+/, '').trim());
              for (let i = 0; i < search.expectedResultIndexes.length; i++) {
                MarcAuthorities.checkAdvancedSearchModalFields(
                  i,
                  lccnNumbers[i],
                  testData.lccnSearchOption,
                  i ? 'OR' : false,
                  testData.exactPhraseModifier,
                );
              }
              MarcAuthorities.closeAdvSearchModal();
            }
            if (index) MarcAuthorities.clickResetAndCheck();
          });
        },
      );
    });
  });
});
