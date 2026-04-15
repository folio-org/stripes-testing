import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      describe('Automated linking', () => {
        const randomPostfix = getRandomPostfix();
        const randomLetters = getRandomLetters(15);

        const testData = {
          tags: {
            tag008: '008',
            tag245: '245',
            tag830: '830',
          },
          bibTitle: `C389475 The algebraic theory of modular systems ${randomPostfix}`,
          authorityHeading: `C389475 Cambridge tracts in mathematics and mathematical physics ${randomPostfix}`,
          // Both authority records share the same naturalId via 010 $a
          sharedNaturalId: `n389475${randomLetters}`,
          successCallout: 'Field 830 has been linked to MARC authority record(s).',
        };

        const authData = { prefix: randomLetters };

        const marcBibFields = [
          {
            tag: testData.tags.tag008,
            content: QuickMarcEditor.valid008ValuesInstance,
          },
          {
            tag: testData.tags.tag245,
            content: `$a ${testData.bibTitle}`,
            indicators: ['1', '0'],
          },
          {
            // 830 field with $0 matching naturalId of BOTH authority records
            tag: testData.tags.tag830,
            content: `$a ${testData.authorityHeading} $0 ${testData.sharedNaturalId}`,
            indicators: ['\\', '0'],
          },
        ];

        // Auth1: 130 uniform title heading — CAN link to bib 830 (130↔830 linking rule exists)
        const authorityFields1 = [
          {
            tag: '010',
            content: `$a ${testData.sharedNaturalId}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: '130',
            content: `$a ${testData.authorityHeading}`,
            indicators: ['\\', '0'],
          },
        ];

        // Auth2: 100 personal name heading — CANNOT link to bib 830 (no 100↔830 linking rule)
        const authorityFields2 = [
          {
            tag: '010',
            content: `$a ${testData.sharedNaturalId}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: '100',
            content: '$a C389475 Test Person, Cambridge, $d 1900-1980',
            indicators: ['1', '\\'],
          },
        ];

        const linkableField = 830;
        let userData = {};
        let createdInstanceId;
        const createdAuthorityIds = [];

        before('Create test data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C389475');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            QuickMarcEditor.setRulesForField(linkableField, true);

            cy.then(() => {
              cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
                (instanceId) => {
                  createdInstanceId = instanceId;
                },
              );

              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                '1',
                authorityFields1,
              ).then((createdRecordId) => {
                createdAuthorityIds.push(createdRecordId);
              });

              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                '2',
                authorityFields2,
              ).then((createdRecordId) => {
                createdAuthorityIds.push(createdRecordId);
              });
            }).then(() => {
              cy.login(userData.username, userData.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            });
          });
        });

        after('Delete test data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
          InventoryInstances.deleteInstanceByTitleViaApi(testData.bibTitle);
          createdAuthorityIds.forEach((id) => {
            MarcAuthority.deleteViaAPI(id, true);
          });
          QuickMarcEditor.setRulesForField(linkableField, false);
        });

        it(
          'C389475 Auto-linking fields when multiple "MARC Authority" records match "$0" but only one of them can be linked when deriving "MARC Bib" record (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C389475'] },
          () => {
            // Step 1: Find and open detail view of record from precondition
            InventoryInstances.searchByTitle(createdInstanceId);
            InventoryInstances.selectInstanceById(createdInstanceId);
            InventoryInstance.waitLoading();

            // Step 2: Click on "Actions" → Select "Derive new MARC bibliographic record"
            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            // Step 3: Click on the "Link headings" button
            // Only Auth1 (130) links to 830; Auth2 (100) is not linkable to 830
            QuickMarcEditor.clickLinkHeadingsButton();
            cy.wait(1000);
            QuickMarcEditor.checkCallout(testData.successCallout);
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();

            // Step 4: Click "Save & close" button
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkCallout('Creating record may take several seconds.');
            QuickMarcEditor.checkCallout('Record created.');

            // Step 5: Click on "Actions" → Select "View source" option
            InventoryInstance.viewSource();
            InventoryViewSource.verifyLinkedToAuthorityIconByTag(testData.tags.tag830);
          },
        );
      });
    });
  });
});
