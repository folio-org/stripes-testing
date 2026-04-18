import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      describe('Automated linking', () => {
        const randomPostfix = getRandomPostfix();
        const randomLetters = getRandomLetters(15);

        // Bib 100 $0 values
        const naturalId1 = `${randomLetters}${randomNDigitNumber(8)}`;
        const naturalId2 = `${randomLetters}${randomNDigitNumber(8)}`;
        const naturalId3 = `${randomLetters}${randomNDigitNumber(8)}`;

        // Bib 650 $0 values — n-prefixed naturalIds for 650 auths, and one non-matching
        const nPrefix = 'n';
        const nNaturalId4Digits = randomNDigitNumber(8);
        const nNaturalId5Digits = randomNDigitNumber(8);
        const nNaturalId4 = `${nPrefix}${nNaturalId4Digits}`;
        const nNaturalId5 = `${nPrefix}${nNaturalId5Digits}`;
        const naturalId6 = `${randomLetters}${randomNDigitNumber(8)}`;

        const testData = {
          tag008: '008',
          tag010: '010',
          tag100: '100',
          tag111: '111',
          tag150: '150',
          tag245: '245',
          tag650: '650',
          bibTitle: `AT_C389491_MarcBibInstance_${randomPostfix}`,
          derivedBibTitle: `AT_C389491_MarcBibInstance_Derived_${randomPostfix}`,
          auth1Heading: `AT_C389491_MarcAuthority1_${randomPostfix}`,
          auth2Heading: `AT_C389491_MarcAuthority2_${randomPostfix}`,
          auth3Heading: `AT_C389491_MarcAuthority3_${randomPostfix}`,
          auth4Heading: `AT_C389491_MarcAuthority4_${randomPostfix}`,
          auth5Heading: `AT_C389491_MarcAuthority5_${randomPostfix}`,
          auth6Heading: `AT_C389491_MarcAuthority6_${randomPostfix}`,
          // Bib 100: naturalId1 matches auth1 (100) and auth5 (100) → error
          // Bib 100: naturalId2 matches auth2 (100, but only $z in 010 → not valid) → not linkable
          // Bib 100: naturalId3 matches auth1 via 001 → also covered by auth1
          // Bib 650: nNaturalId4 matches auth4 (150) and nNaturalId5 matches auth3 (150) → error
          // Bib 650: naturalId6 matches auth6 (111) → not linkable to 650
          errorCalloutMessage:
            'Field 100 and 650 must be set manually by selecting the link icon. There are multiple authority records that can be matched to this bibliographic field.',
        };

        // Auth 1: 100 field, 001 = naturalId3, 010 $a = naturalId1 (valid) → linkable to bib 100 via naturalId1 and naturalId3
        const auth1Fields = [
          {
            tag: testData.tag010,
            content: `$a ${naturalId1}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: testData.tag100,
            content: `$a ${testData.auth1Heading}`,
            indicators: ['1', '\\'],
          },
        ];

        // Auth 2: 100 field, 001 = naturalId2, 010 only has $z (not valid/current) → NOT linkable
        const auth2Fields = [
          {
            tag: testData.tag010,
            content: `$z ${randomNDigitNumber(6)}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: testData.tag100,
            content: `$a ${testData.auth2Heading}`,
            indicators: ['1', '\\'],
          },
        ];

        // Auth 3: 150 field, 010 $a = nNaturalId5 → linkable to bib 650
        const auth3Fields = [
          {
            tag: testData.tag010,
            content: `$a ${nNaturalId5}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: testData.tag150,
            content: `$a ${testData.auth3Heading}`,
            indicators: ['\\', '\\'],
          },
        ];

        // Auth 4: 150 field, 010 $a = nNaturalId4 → linkable to bib 650
        const auth4Fields = [
          {
            tag: testData.tag010,
            content: `$a ${nNaturalId4}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: testData.tag150,
            content: `$a ${testData.auth4Heading}`,
            indicators: ['\\', '\\'],
          },
        ];

        // Auth 5: 100 field, 001 = naturalId1, 010 $a valid, $z = cancelled → linkable to bib 100 via naturalId1
        const auth5Fields = [
          {
            tag: testData.tag010,
            content: `$a ${randomNDigitNumber(7)} $z ${randomNDigitNumber(6)}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: testData.tag100,
            content: `$a ${testData.auth5Heading}`,
            indicators: ['1', '\\'],
          },
        ];

        // Auth 6: 111 field, 001 = naturalId6, 010 only $z → NOT linkable to bib 650
        const auth6Fields = [
          {
            tag: testData.tag010,
            content: `$z ${randomNDigitNumber(6)}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: testData.tag111,
            content: `$a ${testData.auth6Heading}`,
            indicators: ['2', '\\'],
          },
        ];

        const bibFields = [
          {
            tag: testData.tag008,
            content: QuickMarcEditor.valid008ValuesInstance,
          },
          {
            tag: testData.tag245,
            content: `$a ${testData.bibTitle}`,
            indicators: ['1', '1'],
          },
          {
            tag: testData.tag100,
            content: `$a Initial value $0 ${naturalId1} $0 ${naturalId2} $0 ${naturalId3}`,
            indicators: ['1', '\\'],
          },
          {
            tag: testData.tag650,
            content: `$a Initial value $0 ${nNaturalId4} $0 ${nNaturalId5} $0 ${naturalId6}`,
            indicators: ['\\', '0'],
          },
        ];

        let user;
        let createdInstanceId;
        const createdAuthorityIds = [];

        before('Create test data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C389491');
          InventoryInstances.deleteInstanceByTitleViaApi('C389491');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((userProperties) => {
            user = userProperties;

            cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, bibFields).then(
              (instanceId) => {
                createdInstanceId = instanceId;
              },
            );

            // Auth 1: 001 = naturalId3, 010 $a = naturalId1 → matches bib 100 $0 naturalId1 and naturalId3
            MarcAuthorities.createMarcAuthorityViaAPI(
              randomLetters,
              naturalId3.replace(randomLetters, ''),
              auth1Fields,
            ).then((id) => createdAuthorityIds.push(id));

            // Auth 2: 001 = naturalId2, 010 only $z → not linkable
            MarcAuthorities.createMarcAuthorityViaAPI(
              randomLetters,
              naturalId2.replace(randomLetters, ''),
              auth2Fields,
            ).then((id) => createdAuthorityIds.push(id));

            // Auth 3: 010 $a = nNaturalId5 → linkable to bib 650
            MarcAuthorities.createMarcAuthorityViaAPI(
              `${randomLetters}a`,
              randomNDigitNumber(7),
              auth3Fields,
            ).then((id) => createdAuthorityIds.push(id));

            // Auth 4: 010 $a = nNaturalId4 → linkable to bib 650
            MarcAuthorities.createMarcAuthorityViaAPI(
              `${randomLetters}b`,
              randomNDigitNumber(7),
              auth4Fields,
            ).then((id) => createdAuthorityIds.push(id));

            // Auth 5: 001 = naturalId1 → matches bib 100 $0 naturalId1
            MarcAuthorities.createMarcAuthorityViaAPI(
              randomLetters,
              naturalId1.replace(randomLetters, ''),
              auth5Fields,
            ).then((id) => createdAuthorityIds.push(id));

            // Auth 6: 001 = naturalId6, 111 field → not linkable to 650
            MarcAuthorities.createMarcAuthorityViaAPI(
              randomLetters,
              naturalId6.replace(randomLetters, ''),
              auth6Fields,
            ).then((id) => createdAuthorityIds.push(id));

            QuickMarcEditor.setRulesForField(testData.tag100, true);
            QuickMarcEditor.setRulesForField(testData.tag650, true);

            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('Delete test data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
          InventoryInstances.deleteInstanceByTitleViaApi('C389491');
          createdAuthorityIds.forEach((id) => MarcAuthority.deleteViaAPI(id, true));
        });

        it(
          'C389491 Auto-linking fields with multiple "$0" when several "MARC Authority" records can be linked when deriving "MARC Bib" record (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C389491'] },
          () => {
            // Step 1: Find and open detail view
            InventoryInstances.searchByTitle(createdInstanceId);
            InventoryInstances.selectInstanceById(createdInstanceId);
            InventoryInstance.waitLoading();

            // Step 2: Derive new MARC bib record
            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            // Step 3: Click "Link headings" - neither 100 nor 650 gets linked, both show error
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout(testData.errorCalloutMessage);
            QuickMarcEditor.verifyTagFieldAfterUnlinkingByTag(
              bibFields[2].tag,
              bibFields[2].indicators[0],
              bibFields[2].indicators[1],
              bibFields[2].content,
            );
            QuickMarcEditor.verifyTagFieldAfterUnlinkingByTag(
              bibFields[3].tag,
              bibFields[3].indicators[0],
              bibFields[3].indicators[1],
              bibFields[3].content,
            );
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            // Step 4: Update title to make derived record unique, then Save & close
            QuickMarcEditor.updateExistingField(testData.tag245, `$a ${testData.derivedBibTitle}`);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndCloseDerive();
            InventoryInstance.waitLoading();

            // Step 5: View source - no MARC authority icon on any field
            InventoryInstance.viewSource();
            InventoryViewSource.verifyLinkedToAuthorityIconByTag(testData.tag100, false);
            InventoryViewSource.verifyLinkedToAuthorityIconByTag(testData.tag650, false);
          },
        );
      });
    });
  });
});
