import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      describe('Automated linking', () => {
        const randomPostfix = getRandomPostfix();
        const sourcePrefix = 'n';
        const randomDigits = `389475${randomNDigitNumber(15)}`;
        const sourceUrlPrefix = 'http://id.loc.gov/authorities/names/';

        // naturalId shared by both authority records and referenced in bib 830 $0
        const naturalId = `${sourcePrefix}${randomDigits}`;

        const testData = {
          tag830: '830',
          tag010: '010',
          tag111: '111',
          tag130: '130',
          tag008: '008',
          tag245: '245',
          bibTitle: `AT_C389475_MarcBibInstance_${randomPostfix}`,
          auth130Heading: `AT_C389475_MarcAuthority130_${randomPostfix}`,
          auth111Heading: `AT_C389475_MarcAuthority111_${randomPostfix}`,
          successCalloutMessage: 'Field 830 has been linked to MARC authority record(s).',
        };

        // Auth 1: 111 field, 001 = naturalId → NOT linkable to 830
        const auth111Fields = [
          {
            tag: testData.tag111,
            content: `$a ${testData.auth111Heading}`,
            indicators: ['2', '\\'],
          },
        ];

        // Auth 2: 130 field, 010 $a = naturalId → linkable to 830
        const auth130Fields = [
          {
            tag: testData.tag010,
            content: `$a ${naturalId}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: testData.tag130,
            content: `$a ${testData.auth130Heading}`,
            indicators: ['\\', '\\'],
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
            tag: testData.tag830,
            content: `$a Initial value $0 ${naturalId}`,
            indicators: ['\\', '0'],
          },
        ];

        let user;
        let createdInstanceId;
        let auth111Id;
        let auth130Id;

        before('Create test data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C389475');
          InventoryInstances.deleteInstanceByTitleViaApi('C389475');

          QuickMarcEditor.setRulesForField(830, true);

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

            // Auth with 111 field: 001 = naturalId (NOT linkable to 830)
            MarcAuthorities.createMarcAuthorityViaAPI(
              sourcePrefix,
              randomDigits,
              auth111Fields,
            ).then((id) => {
              auth111Id = id;
            });

            // Auth with 130 field: 010 $a = naturalId (linkable to 830)
            MarcAuthorities.createMarcAuthorityViaAPI(
              `x${sourcePrefix}`,
              randomDigits,
              auth130Fields,
            ).then((id) => {
              auth130Id = id;
            });

            QuickMarcEditor.setRulesForField(testData.tag830, true);

            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('Delete test data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
          InventoryInstances.deleteInstanceByTitleViaApi('C389475');
          MarcAuthority.deleteViaAPI(auth111Id, true);
          MarcAuthority.deleteViaAPI(auth130Id, true);
        });

        it(
          'C389475 Auto-linking fields when multiple "MARC Authority" records match "$0" but only one of them can be linked when deriving "MARC Bib" record (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C389475'] },
          () => {
            // Step 1: Find and open detail view
            InventoryInstances.searchByTitle(createdInstanceId);
            InventoryInstances.selectInstanceById(createdInstanceId);
            InventoryInstance.waitLoading();

            // Step 2: Derive new MARC bib record
            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            // Step 3: Click "Link headings" - only 830 (linked to 130 auth) should be linked
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout(testData.successCalloutMessage);
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(
              testData.tag830,
              '\\',
              '0',
              `$a ${testData.auth130Heading}`,
              '',
              `$0 ${sourceUrlPrefix}${naturalId}`,
              '',
            );

            // Step 4: Save & close
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndCloseDerive();
            InventoryInstance.waitLoading();

            // Step 5: View source - 830 field has MARC authority icon
            InventoryInstance.viewSource();
            InventoryViewSource.verifyLinkedToAuthorityIconByTag(testData.tag830, true);
          },
        );
      });
    });
  });
});
