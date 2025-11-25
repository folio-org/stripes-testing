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
    describe('Create new MARC bib', () => {
      describe('Manual linking', () => {
        const randomPostfix = getRandomPostfix();
        const randomLetters = getRandomLetters(15);
        const testData = {
          tags: {
            tag245: '245',
            tag800: '800',
            tag810: '810',
            tag811: '811',
            tag830: '830',
          },
          bibTitle: `AT_C569604_MarcBibInstance_${randomPostfix}`,
          // Authority field contents
          authorityField100Content: `$a AT_C569604_MarcAuthority_${randomPostfix} with 100 field $b Numeration $c (Fictitious character) $d Dates associated with a name $c second title $e Relator term $f Date of a work $g Miscellaneous information $h Medium $j Attribution qualifier $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $q Fuller form of name $r Key for music $s Version $t Wakanda Forever $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision $6 Linkage $7 Data provenance $8 Field link and sequence number`,
          authorityField110Content: `$a AT_C569604_MarcAuthority_${randomPostfix} with 110 field $b Hrvatski program $c Location of meeting $d Date of meeting or treaty signing $e Relator term $e Term 2 $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section/meeting $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision $6 Linkage $7 Data provenance $8 Field link and sequence number`,
          authorityField111Content: `$a AT_C569604_MarcAuthority_${randomPostfix} with 111 field $c Location of meeting $d Date of meeting or treaty signing $e Subordinate unit $f Date of a work $g Miscellaneous information $h Medium $j Relator term $k Form subheading $l Language of a work $n Number of part/section/meeting $p Name of part/section of a work $q Name of meeting following jurisdiction name entry element $s Version $t Title of a work $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision $6 - Linkage $7 Data provenance $8 Filed link and sequence number`,
          authorityField130Content: `$a AT_C569604_MarcAuthority_${randomPostfix} with 130 field $d Date of treaty signing $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision $6 Linkage $7 Data provenance $8 Field link and sequence number`,
          // Bibliographic field content for 8XX fields
          bibField800Content: `$a AT_C569604_MarcAuthority_${randomPostfix} with 100 field $b Numeration $c (Fictitious character) $d Dates associated with a name $e Relator term $f Date of a work $g Miscellaneous information $h Medium $j Attribution qualifier $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $q Fuller form of name $r Key for music $s Version $t Wakanda Forever $u Affiliation $v Volume $w Bibliographic $x International $y Data provenance`,
          bibField810Content: `$a AT_C569604_MarcAuthority_${randomPostfix} with 110 field $b Hrvatski program $c Location of meeting $d Date of meeting or treaty signing $e Relator term $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section/meeting $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work $u Affiliation $v Volume $w Bibliographic $x International $y Data $1 Real`,
          bibField811Content: `$a AT_C569604_MarcAuthority_${randomPostfix} with 111 field $c Location of meeting $d Date of meeting or treaty signing $e Subordinate unit $f Date of a work $g Miscellaneous information $h Medium $j Relator term $k Form subheading $l Language of a work $n Number of part/section/meeting $p Name of part/section of a work $q Name of meeting following jurisdiction name entry element $s Version $t Title of a work $u Affiliation $v Volume $w Bibliographic $x International $y Data $6 test`,
          bibField830Content: `$a AT_C569604_MarcAuthority_${randomPostfix} with 130 field $d Date of treaty signing $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work $v Volume $w Bibliographic $x International $y Data $2 Source`,
          // Authority headings
          authorityHeading100: `AT_C569604_MarcAuthority_${randomPostfix} with 100 field Numeration (Fictitious character) Dates associated with a name second title Date of a work Form subheading Language of a work Medium of performance for music Number of part/section of a work Arranged statement for music Name of part/section of a work Fuller form of name Key for music Version Wakanda Forever`,
          authorityHeading110: `AT_C569604_MarcAuthority_${randomPostfix} with 110 field Hrvatski program Location of meeting Date of meeting or treaty signing Date of a work Form subheading Language of a work Medium of performance for music Number of part/section/meeting Arranged statement for music Name of part/section of a work Key for music Version Title of a work`,
          authorityHeading111: `AT_C569604_MarcAuthority_${randomPostfix} with 111 field Location of meeting Date of meeting or treaty signing Date of a work Form subheading Language of a work Number of part/section/meeting Name of part/section of a work Name of meeting following jurisdiction name entry element Version Title of a work`,
          authorityHeading130: `AT_C569604_MarcAuthority_${randomPostfix} with 130 field Date of treaty signing Date of a work Miscellaneous information Medium Form subheading Language of a work Medium of performance for music Number of part/section of a work Arranged statement for music Name of part/section of a work Key for music Version Title of a work Form subdivision General subdivision Chronological subdivision Geographic subdivision`,
          // Default search queries
          searchQuery800: `AT_C569604_MarcAuthority_${randomPostfix} with 100 field Numeration (Fictitious character) Dates associated with a name Date of a work Miscellaneous information Medium Attribution qualifier Form subheading Language of a work Medium of performance for music Number of part/section of a work Arranged statement for music Name of part/section of a work Fuller form of name Key for music Version Wakanda Forever`,
          searchQuery810: `AT_C569604_MarcAuthority_${randomPostfix} with 110 field Hrvatski program Location of meeting Date of meeting or treaty signing Date of a work Miscellaneous information Medium Form subheading Language of a work Medium of performance for music Number of part/section/meeting Arranged statement for music Name of part/section of a work Key for music Version Title of a work`,
          searchQuery811: `AT_C569604_MarcAuthority_${randomPostfix} with 111 field Location of meeting Date of meeting or treaty signing Subordinate unit Date of a work Miscellaneous information Medium Form subheading Language of a work Number of part/section/meeting Name of part/section of a work Name of meeting following jurisdiction name entry element Version Title of a work`,
          searchQuery830: `AT_C569604_MarcAuthority_${randomPostfix} with 130 field Date of treaty signing Date of a work Miscellaneous information Medium Form subheading Language of a work Medium of performance for music Number of part/section of a work Arranged statement for music Name of part/section of a work Key for music Version Title of a work`,
          browseOption800: MARC_AUTHORITY_BROWSE_OPTIONS.NAME_TITLE,
          browseOption810: MARC_AUTHORITY_BROWSE_OPTIONS.NAME_TITLE,
          browseOption811: MARC_AUTHORITY_BROWSE_OPTIONS.NAME_TITLE,
          browseOption830: MARC_AUTHORITY_BROWSE_OPTIONS.UNIFORM_TITLE,
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
              tag: '100',
              content: testData.authorityField100Content,
              indicators: ['0', '\\'],
            },
          ],
          [
            {
              tag: '110',
              content: testData.authorityField110Content,
              indicators: ['2', '0'],
            },
          ],
          [
            {
              tag: '111',
              content: testData.authorityField111Content,
              indicators: ['2', '\\'],
            },
          ],
          [
            {
              tag: '130',
              content: testData.authorityField130Content,
              indicators: ['\\', '0'],
            },
          ],
        ];

        const linkedFieldData = [
          {
            tag: testData.tags.tag800,
            ind1: '\\',
            ind2: '\\',
            controlledLetterSubfields: `$a AT_C569604_MarcAuthority_${randomPostfix} with 100 field $b Numeration $c (Fictitious character) $d Dates associated with a name $c second title $f Date of a work $g Miscellaneous information $h Medium $j Attribution qualifier $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $q Fuller form of name $r Key for music $s Version $t Wakanda Forever`,
            uncontrolledLetterSubfields:
              '$e Relator term $u Affiliation $v Volume $w Bibliographic $x International $y Data provenance',
            controlledDigitSubfields: `$0 ${authData[0].prefix}${authData[0].startWithNumber}`,
            uncontrolledDigitSubfields: '',
          },
          {
            tag: testData.tags.tag810,
            ind1: '\\',
            ind2: '\\',
            controlledLetterSubfields: `$a AT_C569604_MarcAuthority_${randomPostfix} with 110 field $b Hrvatski program $c Location of meeting $d Date of meeting or treaty signing $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section/meeting $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work`,
            uncontrolledLetterSubfields:
              '$e Relator term $u Affiliation $v Volume $w Bibliographic $x International $y Data',
            controlledDigitSubfields: `$0 ${authData[1].prefix}${authData[1].startWithNumber}`,
            uncontrolledDigitSubfields: '$1 Real',
          },
          {
            tag: testData.tags.tag811,
            ind1: '\\',
            ind2: '\\',
            controlledLetterSubfields: `$a AT_C569604_MarcAuthority_${randomPostfix} with 111 field $c Location of meeting $d Date of meeting or treaty signing $e Subordinate unit $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $n Number of part/section/meeting $p Name of part/section of a work $q Name of meeting following jurisdiction name entry element $s Version $t Title of a work`,
            uncontrolledLetterSubfields:
              '$j Relator term $u Affiliation $v Volume $w Bibliographic $x International $y Data',
            controlledDigitSubfields: `$0 ${authData[2].prefix}${authData[2].startWithNumber}`,
            uncontrolledDigitSubfields: '$6 test',
          },
          {
            tag: testData.tags.tag830,
            ind1: '\\',
            ind2: '\\',
            controlledLetterSubfields: `$a AT_C569604_MarcAuthority_${randomPostfix} with 130 field $d Date of treaty signing $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work`,
            uncontrolledLetterSubfields: '$v Volume $w Bibliographic $x International $y Data',
            controlledDigitSubfields: `$0 ${authData[3].prefix}${authData[3].startWithNumber}`,
            uncontrolledDigitSubfields: '$2 Source',
          },
        ];

        let userData = {};
        let createdInstanceId;
        const createdAuthorityIds = [];

        before(() => {
          cy.getAdminToken();
          // Make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C569604_MarcAuthority');

          cy.createTempUser([
            Permissions.uiInventoryViewInstances.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

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

            cy.waitForAuthRefresh(() => {
              cy.login(userData.username, userData.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            }, 20_000);
          });
        });

        after(() => {
          cy.getAdminToken();
          createdAuthorityIds.forEach((id) => {
            MarcAuthority.deleteViaAPI(id, true);
          });
          if (createdInstanceId) InventoryInstance.deleteInstanceViaApi(createdInstanceId);
          Users.deleteViaApi(userData.userId);
        });

        it(
          'C569604 Link "Series" fields (with all subfields) when MARC authority 1XXs have all subfields (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C569604'] },
          () => {
            // Step 1: Click on "Actions" button in second pane >> Select "New MARC bibliographic record" option
            InventoryInstance.newMarcBibRecord();

            // Step 2-3: Select valid values in "LDR" positions 06 (Type), 07 (BLvl) and configure 008 field
            QuickMarcEditor.updateLDR06And07Positions();

            // Step 4: Fill in the "245" field with any valid value
            QuickMarcEditor.updateExistingField(testData.tags.tag245, `$a ${testData.bibTitle}`);

            // Step 5-7: Add "800" field and link it
            MarcAuthority.addNewField(4, testData.tags.tag800, testData.bibField800Content);
            QuickMarcEditor.clickLinkIconInTagFieldByTag(testData.tags.tag800);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.verifyBrowseTabIsOpened();
            MarcAuthorities.checkSearchQuery(testData.searchQuery800);
            MarcAuthoritiesSearch.verifySelectedSearchOption(testData.browseOption800);
            MarcAuthorities.verifyRecordFound(testData.authorityHeading100);
            MarcAuthorities.selectIncludingTitle(testData.authorityHeading100);
            MarcAuthority.waitLoading();
            MarcAuthorities.clickLinkButton();
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData[0]));

            // Step 8-10: Add "810" field and link it
            MarcAuthority.addNewField(5, testData.tags.tag810, testData.bibField810Content);
            QuickMarcEditor.clickLinkIconInTagFieldByTag(testData.tags.tag810);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.verifyBrowseTabIsOpened();
            MarcAuthorities.checkSearchQuery(testData.searchQuery810);
            MarcAuthoritiesSearch.verifySelectedSearchOption(testData.browseOption810);
            MarcAuthorities.verifyRecordFound(testData.authorityHeading110);
            MarcAuthorities.selectIncludingTitle(testData.authorityHeading110);
            MarcAuthority.waitLoading();
            MarcAuthorities.clickLinkButton();
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData[1]));

            // Step 11-13: Add "811" field and link it
            MarcAuthority.addNewField(6, testData.tags.tag811, testData.bibField811Content);
            QuickMarcEditor.clickLinkIconInTagFieldByTag(testData.tags.tag811);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.verifyBrowseTabIsOpened();
            MarcAuthorities.checkSearchQuery(testData.searchQuery811);
            MarcAuthoritiesSearch.verifySelectedSearchOption(testData.browseOption811);
            MarcAuthorities.verifyRecordFound(testData.authorityHeading111);
            MarcAuthorities.selectIncludingTitle(testData.authorityHeading111);
            MarcAuthority.waitLoading();
            MarcAuthorities.clickLinkButton();
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData[2]));

            // Step 14-16: Add "830" field and link it
            MarcAuthority.addNewField(7, testData.tags.tag830, testData.bibField830Content);
            QuickMarcEditor.clickLinkIconInTagFieldByTag(testData.tags.tag830);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.verifyBrowseTabIsOpened();
            MarcAuthorities.checkSearchQuery(testData.searchQuery830);
            MarcAuthoritiesSearch.verifySelectedSearchOption(testData.browseOption830);
            MarcAuthorities.verifyRecordFound(testData.authorityHeading130);
            MarcAuthorities.selectIncludingTitle(testData.authorityHeading130);
            MarcAuthority.waitLoading();
            MarcAuthorities.clickLinkButton();
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData[3]));

            // Step 17: Click on the "Save & close" button
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.getId().then((id) => {
              createdInstanceId = id;
            });

            // Step 18: Click on "Actions" button in third pane >> Select "Edit MARC bibliographic record" option
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.waitLoading();
            // Verify all "8XX" fields are linked and displayed same data as before
            linkedFieldData.forEach((fieldData) => {
              QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(fieldData));
            });
          },
        );
      });
    });
  });
});
