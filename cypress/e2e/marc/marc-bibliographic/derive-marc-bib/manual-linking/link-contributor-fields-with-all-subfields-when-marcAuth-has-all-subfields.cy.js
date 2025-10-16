import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../../support/utils/stringTools';
import { MARC_AUTHORITY_BROWSE_OPTIONS } from '../../../../../support/constants';
import MarcAuthoritiesSearch from '../../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      describe('Manual linking', () => {
        const randomPostfix = getRandomPostfix();
        const randomLetters = getRandomLetters(15);
        const testData = {
          tags: {
            tag008: '008',
            tag100: '100',
            tag110: '110',
            tag111: '111',
            tag130: '130',
            tag245: '245',
            tag700: '700',
            tag710: '710',
            tag711: '711',
            tag730: '730',
          },
          bibTitle: `AT_C569601_MarcBibInstance_${randomPostfix}`,
          // Authority field contents
          authorityField100Content: `$a AT_C569601_MarcAuthority_${randomPostfix} with 100 field $b Numeration $c (Fictitious character) $d Dates associated with a name $c second title $e Relator term $f Date of a work $g Miscellaneous information $h Medium $j Attribution qualifier $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $q Fuller form of name $r Key for music $s Version $t Wakanda Forever $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision $6 Linkage $7 Data provenance $8 Field link and sequence number`,
          authorityField110Content: `$a AT_C569601_MarcAuthority_${randomPostfix} with 110 field $b Hrvatski program $c Location of meeting $d Date of meeting or treaty signing $e Relator term $e Term 2 $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section/meeting $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision $6 Linkage $7 Data provenance $8 Field link and sequence number`,
          authorityField111Content: `$a AT_C569601_MarcAuthority_${randomPostfix} with 111 field $c Location of meeting $d Date of meeting or treaty signing $e Subordinate unit $f Date of a work $g Miscellaneous information $h Medium $j Relator term $k Form subheading $l Language of a work $n Number of part/section/meeting $p Name of part/section of a work $q Name of meeting following jurisdiction name entry element $s Version $t Title of a work $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision $6 - Linkage $7 Data provenance $8 Filed link and sequence number`,
          authorityField130Content: `$a AT_C569601_MarcAuthority_${randomPostfix} with 130 field $d Date of treaty signing $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision $6 Linkage $7 Data provenance $8 Field link and sequence number`,
          // Bibliographic field content for 7XX fields
          bibField700Content: `$a AT_C569601_MarcAuthority_${randomPostfix} with 100 field $e artist. $b Numeration $c (Fictitious) $d Dates $f Date $g information $h Medium $i Item $j qualifier $k Form $l Language $m Medium $n Number $o statement $p Name $q Fullerform $r Key $s Version $t Wakanda Forever $u Affil $s Serial $1 test`,
          bibField710Content: `$a AT_C569601_MarcAuthority_${randomPostfix} with 110 field $b Hrvatski $c Location $d Date $e test $f work $g Miscellaneous $h Medium $i item $k Form $lLanguage $m Medium $n Number $o Arranged $p Name $r Key $s Version $t Title $u Aff $x Number`,
          bibField711Content: `$a AT_C569601_MarcAuthority_${randomPostfix} with 111 field $c Location $d Date $e Unit $f Date $g Miscellaneous $h Medium $i Item $j Joy $k Form $l Language $n Number $p Name $q Name of meeting $s Version $t Title $u Aff $x Number $8 test`,
          bibField730Content: `$a AT_C569601_MarcAuthority_${randomPostfix} with 130 field $d Date $f work $g Miscellaneous $h Medium $i Item $k Form $l Language $m Medium $n Number $o Arranged $p Name $r Key $s Version $t Title $x Test $1 test`,
          // Authority headings
          authorityHeading100: `AT_C569601_MarcAuthority_${randomPostfix} with 100 field Numeration (Fictitious character) Dates associated with a name second title Date of a work Form subheading Language of a work Medium of performance for music Number of part/section of a work Arranged statement for music Name of part/section of a work Fuller form of name Key for music Version Wakanda Forever`,
          authorityHeading110: `AT_C569601_MarcAuthority_${randomPostfix} with 110 field Hrvatski program Location of meeting Date of meeting or treaty signing Date of a work Form subheading Language of a work Medium of performance for music Number of part/section/meeting Arranged statement for music Name of part/section of a work Key for music Version Title of a work`,
          authorityHeading111: `AT_C569601_MarcAuthority_${randomPostfix} with 111 field Location of meeting Date of meeting or treaty signing Date of a work Form subheading Language of a work Number of part/section/meeting Name of part/section of a work Name of meeting following jurisdiction name entry element Version Title of a work`,
          authorityHeading130: `AT_C569601_MarcAuthority_${randomPostfix} with 130 field Date of treaty signing Date of a work Miscellaneous information Medium Form subheading Language of a work Medium of performance for music Number of part/section of a work Arranged statement for music Name of part/section of a work Key for music Version Title of a work Form subdivision General subdivision Chronological subdivision Geographic subdivision`,
          // Default search queries, options
          searchQuery700: `AT_C569601_MarcAuthority_${randomPostfix} with 100 field Numeration (Fictitious) Dates Date information Medium qualifier Form Language Medium Number statement Name Fullerform Key Version Wakanda Forever Serial`,
          searchQuery710: `AT_C569601_MarcAuthority_${randomPostfix} with 110 field Hrvatski Location Date work Miscellaneous Medium Form Language Medium Number Arranged Name Key Version Title`,
          searchQuery711: `AT_C569601_MarcAuthority_${randomPostfix} with 111 field Location Date Unit Date Miscellaneous Medium Form Language Number Name Name of meeting Version Title`,
          searchQuery730: `AT_C569601_MarcAuthority_${randomPostfix} with 130 field Date work Miscellaneous Medium Form Language Medium Number Arranged Name Key Version Title`,
          browseOption700: MARC_AUTHORITY_BROWSE_OPTIONS.NAME_TITLE,
          browseOption710: MARC_AUTHORITY_BROWSE_OPTIONS.NAME_TITLE,
          browseOption711: MARC_AUTHORITY_BROWSE_OPTIONS.NAME_TITLE,
          browseOption730: MARC_AUTHORITY_BROWSE_OPTIONS.UNIFORM_TITLE,
        };

        const authData = [
          { prefix: randomLetters, startWithNumber: '1' },
          { prefix: randomLetters, startWithNumber: '2' },
          { prefix: randomLetters, startWithNumber: '3' },
          { prefix: randomLetters, startWithNumber: '4' },
        ];

        const authorityFields = [
          [
            {
              tag: testData.tags.tag100,
              content: testData.authorityField100Content,
              indicators: ['0', '\\'],
            },
          ],
          [
            {
              tag: testData.tags.tag110,
              content: testData.authorityField110Content,
              indicators: ['2', '0'],
            },
          ],
          [
            {
              tag: testData.tags.tag111,
              content: testData.authorityField111Content,
              indicators: ['2', '\\'],
            },
          ],
          [
            {
              tag: testData.tags.tag130,
              content: testData.authorityField130Content,
              indicators: ['\\', '0'],
            },
          ],
        ];

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
            tag: testData.tags.tag700,
            content: testData.bibField700Content,
            indicators: ['1', '\\'],
          },
          {
            tag: testData.tags.tag710,
            content: testData.bibField710Content,
            indicators: ['1', '\\'],
          },
          {
            tag: testData.tags.tag711,
            content: testData.bibField711Content,
            indicators: ['1', '\\'],
          },
          {
            tag: testData.tags.tag730,
            content: testData.bibField730Content,
            indicators: ['1', '\\'],
          },
        ];

        const linkedFieldData = [
          {
            tag: testData.tags.tag700,
            ind1: '1',
            ind2: '\\',
            controlledLetterSubfields: `$a AT_C569601_MarcAuthority_${randomPostfix} with 100 field $b Numeration $c (Fictitious character) $d Dates associated with a name $c second title $f Date of a work $g Miscellaneous information $h Medium $j Attribution qualifier $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $q Fuller form of name $r Key for music $s Version $t Wakanda Forever`,
            uncontrolledLetterSubfields: '$e artist. $i Item $u Affil',
            controlledDigitSubfields: `$0 ${authData[0].prefix}${authData[0].startWithNumber}`,
            uncontrolledDigitSubfields: '$1 test',
          },
          {
            tag: testData.tags.tag710,
            ind1: '1',
            ind2: '\\',
            controlledLetterSubfields: `$a AT_C569601_MarcAuthority_${randomPostfix} with 110 field $b Hrvatski program $c Location of meeting $d Date of meeting or treaty signing $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section/meeting $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work`,
            uncontrolledLetterSubfields: '$e test $i item $u Aff $x Number',
            controlledDigitSubfields: `$0 ${authData[1].prefix}${authData[1].startWithNumber}`,
            uncontrolledDigitSubfields: '',
          },
          {
            tag: testData.tags.tag711,
            ind1: '1',
            ind2: '\\',
            controlledLetterSubfields: `$a AT_C569601_MarcAuthority_${randomPostfix} with 111 field $c Location of meeting $d Date of meeting or treaty signing $e Subordinate unit $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $n Number of part/section/meeting $p Name of part/section of a work $q Name of meeting following jurisdiction name entry element $s Version $t Title of a work`,
            uncontrolledLetterSubfields: '$i Item $j Joy $u Aff $x Number',
            controlledDigitSubfields: `$0 ${authData[2].prefix}${authData[2].startWithNumber}`,
            uncontrolledDigitSubfields: '$8 test',
          },
          {
            tag: testData.tags.tag730,
            ind1: '1',
            ind2: '\\',
            controlledLetterSubfields: `$a AT_C569601_MarcAuthority_${randomPostfix} with 130 field $d Date of treaty signing $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work`,
            uncontrolledLetterSubfields: '$i Item $x Test',
            controlledDigitSubfields: `$0 ${authData[3].prefix}${authData[3].startWithNumber}`,
            uncontrolledDigitSubfields: '$1 test',
          },
        ];

        let userData = {};
        const createdInstanceIds = [];
        const createdAuthorityIds = [];

        before(() => {
          cy.getAdminToken();
          // Make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C569601_MarcAuthority');

          cy.createTempUser([
            Permissions.uiInventoryViewInstances.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            cy.then(() => {
              // Create MARC bibliographic record
              cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
                (instanceId) => {
                  createdInstanceIds.push(instanceId);
                },
              );
              // Create 4 MARC authority records
              authorityFields.forEach((fields, index) => {
                MarcAuthorities.createMarcAuthorityViaAPI(
                  authData[index].prefix,
                  authData[index].startWithNumber,
                  fields,
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
          'C569601 Link "Contributors" fields (with all subfields) when MARC authority 1XXs have all subfields (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C569601'] },
          () => {
            InventoryInstances.searchByTitle(createdInstanceIds[0]);
            InventoryInstances.selectInstanceById(createdInstanceIds[0]);
            InventoryInstance.waitLoading();
            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.updateLDR06And07Positions();

            QuickMarcEditor.clickLinkIconInTagFieldByTag(testData.tags.tag700);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.verifyBrowseTabIsOpened();
            MarcAuthorities.checkSearchQuery(testData.searchQuery700);
            MarcAuthoritiesSearch.verifySelectedSearchOption(testData.browseOption700);
            MarcAuthorities.verifyRecordFound(testData.authorityHeading100);
            MarcAuthorities.selectIncludingTitle(testData.authorityHeading100);
            MarcAuthority.waitLoading();
            MarcAuthorities.clickLinkButton();
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData[0]));

            QuickMarcEditor.clickLinkIconInTagFieldByTag(testData.tags.tag710);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.verifyBrowseTabIsOpened();
            MarcAuthorities.checkSearchQuery(testData.searchQuery710);
            MarcAuthoritiesSearch.verifySelectedSearchOption(testData.browseOption710);
            MarcAuthorities.verifyRecordFound(testData.authorityHeading110);
            MarcAuthorities.selectIncludingTitle(testData.authorityHeading110);
            MarcAuthority.waitLoading();
            MarcAuthorities.clickLinkButton();
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData[1]));

            QuickMarcEditor.clickLinkIconInTagFieldByTag(testData.tags.tag711);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.verifyBrowseTabIsOpened();
            MarcAuthorities.checkSearchQuery(testData.searchQuery711);
            MarcAuthoritiesSearch.verifySelectedSearchOption(testData.browseOption711);
            MarcAuthorities.verifyRecordFound(testData.authorityHeading111);
            MarcAuthorities.selectIncludingTitle(testData.authorityHeading111);
            MarcAuthority.waitLoading();
            MarcAuthorities.clickLinkButton();
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData[2]));

            QuickMarcEditor.clickLinkIconInTagFieldByTag(testData.tags.tag730);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.verifyBrowseTabIsOpened();
            MarcAuthorities.checkSearchQuery(testData.searchQuery730);
            MarcAuthoritiesSearch.verifySelectedSearchOption(testData.browseOption730);
            MarcAuthorities.verifyRecordFound(testData.authorityHeading130);
            MarcAuthorities.selectIncludingTitle(testData.authorityHeading130);
            MarcAuthority.waitLoading();
            MarcAuthorities.clickLinkButton();
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData[3]));

            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndCloseDerive();
            InventoryInstance.getId().then((id) => {
              createdInstanceIds.push(id);
            });

            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.waitLoading();
            linkedFieldData.forEach((fieldData) => {
              QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(fieldData));
            });
          },
        );
      });
    });
  });
});
