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
            tag110: '110',
            tag240: '240',
            tag245: '245',
          },
          bibTitle: `AT_C569597_MarcBibInstance_${randomPostfix}`,
          authorityField110Content: `$a AT_C569597_MarcAuthority_${randomPostfix} $4 ptf $b Subordinate unit $c Location of meeting $d Date of meeting or treaty signing $e Relator term $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section/meeting $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t AT_C569597_MarcAuthority_${randomPostfix} Title $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision $6 Linkage $7 Data provenance $8 Field link and sequence number`,
          bibField240Content: `$a AT_C569597_MarcAuthority_${randomPostfix} $4 ptf $b Subordinate unit $c Location of meeting $d Date of meeting $d or treaty signing $e Relator term $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section/meeting $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision $1 1$2 2 $6 Linkage $7 Data provenance $8 Field link and sequence number`,
          authorityHeading: `AT_C569597_MarcAuthority_${randomPostfix} Subordinate unit Location of meeting Date of meeting or treaty signing Date of a work Form subheading Language of a work Medium of performance for music Number of part/section/meeting Arranged statement for music Name of part/section of a work Key for music Version AT_C569597_MarcAuthority_${randomPostfix} Title`,
          browseOption: MARC_AUTHORITY_BROWSE_OPTIONS.NAME_TITLE,
        };

        const authData = { prefix: randomLetters, startWithNumber: '1' };

        const authorityFields = [
          {
            tag: testData.tags.tag110,
            content: testData.authorityField110Content,
            indicators: ['2', '\\'],
          },
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
            tag: testData.tags.tag240,
            content: testData.bibField240Content,
            indicators: ['1', '0'],
          },
        ];

        const linkedFieldData = {
          tag: testData.tags.tag240,
          ind1: '1',
          ind2: '0',
          controlledLetterSubfields: `$a AT_C569597_MarcAuthority_${randomPostfix} Title $d Date of meeting or treaty signing $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section/meeting $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version`,
          uncontrolledLetterSubfields:
            '$b Subordinate unit $c Location of meeting $e Relator term $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
          controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber}`,
          uncontrolledDigitSubfields:
            '$4 ptf $1 1 $2 2 $6 Linkage $7 Data provenance $8 Field link and sequence number',
        };

        let userData = {};
        const createdInstanceIds = [];
        const createdAuthorityIds = [];

        before(() => {
          cy.getAdminToken();
          // Make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C569597_MarcAuthority');

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
              // Create MARC authority record
              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                authData.startWithNumber,
                authorityFields,
              ).then((createdRecordId) => {
                createdAuthorityIds.push(createdRecordId);
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
          'C569597 Link "240" field when MARC authority 110 has all subfields (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C569597'] },
          () => {
            InventoryInstances.searchByTitle(createdInstanceIds[0]);
            InventoryInstances.selectInstanceById(createdInstanceIds[0]);
            InventoryInstance.waitLoading();
            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.updateLDR06And07Positions();

            QuickMarcEditor.clickLinkIconInTagFieldByTag(testData.tags.tag240);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.verifyBrowseTabIsOpened();
            MarcAuthoritiesSearch.verifySelectedSearchOption(testData.browseOption);
            MarcAuthorities.switchToSearch();
            MarcAuthorities.verifySearchTabIsOpened();
            MarcAuthorities.searchBeats(testData.authorityHeading);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.authorityHeading);
            MarcAuthorities.clickLinkButton();
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData));

            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndCloseDerive();
            InventoryInstance.getId().then((id) => {
              createdInstanceIds.push(id);
            });

            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData));
          },
        );
      });
    });
  });
});
