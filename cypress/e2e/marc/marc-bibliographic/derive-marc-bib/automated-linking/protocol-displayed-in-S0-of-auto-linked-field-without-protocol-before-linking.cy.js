import { including } from '@interactors/html';
import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, {
  randomNDigitNumber,
  getRandomLetters,
} from '../../../../../support/utils/stringTools';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      describe('Automated linking', () => {
        let userData = {};
        const randomDigits = randomNDigitNumber(8);
        const randomLetters = getRandomLetters(10);
        const randomPostfix = getRandomPostfix();

        const testData = {
          tag245: `AT_MarcBibInstance_C436819_${randomPostfix}`,
          authorityHeadings: [
            `AT_MarcAuthority_C436819_One_${randomPostfix}`,
            `AT_MarcAuthority_C436819_Two_${randomPostfix}`,
            `AT_MarcAuthority_C436819_Three_${randomPostfix}`,
            `AT_MarcAuthority_C436819_Four_${randomPostfix}`,
            `AT_MarcAuthority_C436819_Five_${randomPostfix}`,
          ],
          calloutMessage:
            'Field 100, 240, 655, and 710 has been linked to MARC authority record(s).',
          marcAuthIcon: 'Linked to MARC authority',
        };

        // Tag numbers
        const tags = {
          tag008: '008',
          tag100: '100',
          tag110: '110',
          tag155: '155',
          tag240: '240',
          tag245: '245',
          tag655: '655',
          tag710: '710',
        };

        // Field indicators
        const indicators = {
          tag100: ['1', '\\'],
          tag240: ['1', '0'],
          tag245: ['1', '1'],
          tag655: ['\\', '7'],
          tag710: ['2', '\\'],
        };

        // Base URLs
        const baseUrls = {
          lc: 'id.loc.gov/authorities/names/',
          lcWithProtocol: 'http://id.loc.gov/authorities/names/',
          notSpecified: 'notspecifiedsource/',
          gsafd: 'vocabularyserver.com/gsafd/',
          gsafdWithProtocol: 'https://vocabularyserver.com/gsafd/',
          customHttp: `linking.com/auto/c436819${randomLetters}/prot-http/`,
          customHttpWithProtocol: `http://linking.com/auto/c436819${randomLetters}/prot-http/`,
          customHttps: `linking.com/auto/c436819${randomLetters}/prot-https/`,
          customHttpsWithProtocol: `https://linking.com/auto/c436819${randomLetters}/prot-https/`,
        };

        const uniquePrefix1 = `aa${randomLetters}`;
        const uniquePrefix2 = `bb${randomLetters}`;

        // Generate unique naturalId values
        const naturalIds = {
          lc: `nr94042914${randomDigits}`,
          notSpecified: `2018019878${randomDigits}`,
          gsafd: `gsafd2014026217${randomDigits}`,
          custom1: `000208089${randomDigits}`,
          custom2: `790055919${randomDigits}`,
        };

        const newMarcAuthoritySources = [
          {
            sourceName: `Test auth source file ${getRandomPostfix()}`,
            prefix: uniquePrefix1,
            startWithNumber: '1',
            isChecked: false,
            baseUrl: baseUrls.customHttpWithProtocol,
          },
          {
            sourceName: `Test auth source file ${getRandomPostfix()}`,
            prefix: uniquePrefix2,
            startWithNumber: '1',
            isChecked: false,
            baseUrl: baseUrls.customHttpsWithProtocol,
          },
        ];

        const marcAuthorities = [
          {
            title: testData.authorityHeadings[0],
            prefix: '',
            naturalId: naturalIds.lc,
            fields: [
              {
                tag: tags.tag100,
                content: `$a ${testData.authorityHeadings[0]} $d 1963-`,
              },
            ],
          },
          {
            title: testData.authorityHeadings[1],
            prefix: '',
            naturalId: naturalIds.notSpecified,
            fields: [
              {
                tag: tags.tag100,
                content: `$a ${testData.authorityHeadings[1]} $d 1927-2012. $t AT_C436819_Works ${randomPostfix} $k Selections`,
              },
            ],
          },
          {
            title: testData.authorityHeadings[2],
            prefix: uniquePrefix1,
            naturalId: naturalIds.custom1,
            fields: [
              {
                tag: tags.tag110,
                content: `$a ${testData.authorityHeadings[2]}`,
              },
            ],
          },
          {
            title: testData.authorityHeadings[3],
            prefix: uniquePrefix2,
            naturalId: naturalIds.custom2,
            fields: [
              {
                tag: tags.tag110,
                content: `$a ${testData.authorityHeadings[3]}`,
              },
            ],
          },
          {
            title: testData.authorityHeadings[4],
            prefix: '',
            naturalId: naturalIds.gsafd,
            fields: [
              {
                tag: tags.tag155,
                content: `$a ${testData.authorityHeadings[4]}`,
              },
            ],
          },
        ];

        const linkedTags = [
          [
            4,
            tags.tag100,
            indicators.tag100[0],
            indicators.tag100[1],
            `$a ${testData.authorityHeadings[0]} $d 1963-`,
            '$e artist.',
            `$0 ${baseUrls.lcWithProtocol}${naturalIds.lc}`,
            '',
          ],
          [
            5,
            tags.tag240,
            indicators.tag240[0],
            indicators.tag240[1],
            `$a AT_C436819_Works ${randomPostfix} $k Selections`,
            '',
            `$0 ${naturalIds.notSpecified}`,
            '',
          ],
          [
            7,
            tags.tag655,
            indicators.tag655[0],
            indicators.tag655[1],
            `$a ${testData.authorityHeadings[4]}`,
            '',
            `$0 ${baseUrls.gsafdWithProtocol}${naturalIds.gsafd}`,
            '$2 lcgft',
          ],
          [
            8,
            tags.tag710,
            indicators.tag710[0],
            indicators.tag710[1],
            `$a ${testData.authorityHeadings[2]}`,
            '$e organizer, $e host institution.',
            `$0 ${baseUrls.customHttpWithProtocol}${uniquePrefix1}${naturalIds.custom1}`,
            '',
          ],
          [
            9,
            tags.tag710,
            indicators.tag710[0],
            indicators.tag710[1],
            `$a ${testData.authorityHeadings[3]}`,
            '$e host institution.',
            `$0 ${baseUrls.customHttpsWithProtocol}${uniquePrefix2}${naturalIds.custom2}`,
            '',
          ],
        ];

        const linkableFields = [tags.tag100, tags.tag110, tags.tag240, tags.tag655, tags.tag710];

        const createdAuthorityIds = [];
        const createdAuthSourceIds = [];
        let createdInstanceId;

        before(() => {
          cy.getAdminToken();

          // Delete existing authorities with same titles
          testData.authorityHeadings.forEach((heading) => {
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(heading);
          });

          // Create two custom authority source files
          newMarcAuthoritySources.forEach((source) => {
            cy.createAuthoritySourceFileUsingAPI(
              source.prefix,
              source.startWithNumber,
              source.sourceName,
              source.isChecked,
              source.baseUrl,
              true,
            ).then((sourceId) => {
              createdAuthSourceIds.push(sourceId);
            });
          });

          // wait for authority source files to be processed by a scheduled job
          cy.wait(70_000);
          cy.getAdminToken();

          // Create MARC authority records
          marcAuthorities.forEach((authority) => {
            MarcAuthorities.createMarcAuthorityViaAPI(
              authority.prefix,
              authority.naturalId,
              authority.fields,
            ).then((id) => {
              createdAuthorityIds.push(id);
            });
          });

          // Create MARC bibliographic record
          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, [
            {
              tag: tags.tag008,
              content: QuickMarcEditor.valid008ValuesInstance,
            },
            {
              tag: tags.tag100,
              content: `$a C436819 Whiteread, Rachel, $d 1963- $e artist. $0 ${baseUrls.lc}${naturalIds.lc}`,
              indicators: indicators.tag100,
            },
            {
              tag: tags.tag240,
              content: `$a C436819 Works $k Selections $0 ${baseUrls.notSpecified}${naturalIds.notSpecified}`,
              indicators: indicators.tag240,
            },
            {
              tag: tags.tag245,
              content: `$a ${testData.tag245}`,
              indicators: indicators.tag245,
            },
            {
              tag: tags.tag655,
              content: `$a C436819 Action and adventure fiction $2 lcgft $0 ${baseUrls.gsafd}${naturalIds.gsafd}`,
              indicators: indicators.tag655,
            },
            {
              tag: tags.tag710,
              content: `$a C436819 Tate Britain (Gallery) $e organizer, $e host institution. $0 ${baseUrls.customHttp}${uniquePrefix1}${naturalIds.custom1}`,
              indicators: indicators.tag710,
            },
            {
              tag: tags.tag710,
              content: `$a C436819 St. Louis Art Museum $e host institution. $0 ${baseUrls.customHttps}${uniquePrefix2}${naturalIds.custom2}`,
              indicators: indicators.tag710,
            },
          ]).then((instanceId) => {
            createdInstanceId = instanceId;
          });

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            // Enable auto-linking rules
            linkableFields.forEach((tag) => {
              QuickMarcEditor.setRulesForField(tag, true);
            });

            cy.login(userData.username, userData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('Deleting created users, Instances', () => {
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
          // Delete instances
          InventoryInstances.deleteInstanceByTitleViaApi(testData.tag245);
          // Delete authority records
          createdAuthorityIds.forEach((id) => {
            MarcAuthority.deleteViaAPI(id, true);
          });
          // Delete custom authority source files
          createdAuthSourceIds.forEach((id) => {
            cy.deleteAuthoritySourceFileViaAPI(id, true);
          });
        });

        it(
          'C436819 Protocol is displayed in subfield "$0" of automatically linked field when field has base URL without protocol before linking (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C436819'] },
          () => {
            InventoryInstances.searchByTitle(createdInstanceId);
            InventoryInstances.selectInstance();

            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.checkPaneheaderContains('Derive a new MARC bib record');
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            // Verify $0 fields don't have protocol before linking
            QuickMarcEditor.checkContentByTag(
              tags.tag100,
              including(`$0 ${baseUrls.lc}${naturalIds.lc}`),
            );
            QuickMarcEditor.checkContentByTag(
              tags.tag240,
              including(`$0 ${baseUrls.notSpecified}${naturalIds.notSpecified}`),
            );
            QuickMarcEditor.checkContentByTag(
              tags.tag655,
              including(`$0 ${baseUrls.gsafd}${naturalIds.gsafd}`),
            );
            QuickMarcEditor.checkContent(
              including(`$0 ${baseUrls.customHttp}${uniquePrefix1}${naturalIds.custom1}`),
              8,
            );
            QuickMarcEditor.checkContent(
              including(`$0 ${baseUrls.customHttps}${uniquePrefix2}${naturalIds.custom2}`),
              9,
            );

            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout(testData.calloutMessage);
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            linkedTags.forEach((field) => {
              QuickMarcEditor.verifyTagFieldAfterLinking(...field);
            });
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.verifyAfterDerivedMarcBibSave();

            InventoryInstance.viewSource();
            linkedTags.forEach((field) => {
              InventoryViewSource.verifyLinkedToAuthorityIcon(field[0]);
              InventoryViewSource.verifyExistanceOfValueInRow(
                `${field[4]}${field[5] ? ` ${field[5]}` : ''} ${field[6]} $9`,
                field[0],
              );
            });
          },
        );
      });
    });
  });
});
