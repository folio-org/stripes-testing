import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../../support/utils/stringTools';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Optimistic locking', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(13);
      const randomDigits = `376995${randomNDigitNumber(5)}`;

      const marcFieldTags = {
        tag008: '008',
        tag042: '042',
        tag100: '100',
        tag240: '240',
        tag245: '245',
      };

      const testData = {
        authoritySubfieldA: `AT_C376995_MarcAuthority_${randomPostfix}_SubfieldA`,
        authoritySubfieldD: '1770-1827',
        authoritySubfieldT_Original: `AT_C376995_MarcAuthority_${randomPostfix}_SubfieldT`,
        authoritySubfieldT_UpdatedByB: `AT_C376995_MarcAuthority_${randomPostfix}_SubfieldT_Updated`,
        authoritySubfieldM: 'piano, violin, cello',
        authoritySubfieldN: 'op. 44',
        authoritySubfieldR: 'E♭ major',
        instanceTitle: `AT_C376995_MarcBibInstance_${randomPostfix}`,
        bib240SubfieldM: 'piano',
        bib240SubfieldK: 'Selections',
        bib042UpdatedByA: 'Test2',
        authorityNaturalId: `${randomLetters}${randomDigits}`,
      };

      const marcAuthFields = [
        {
          tag: marcFieldTags.tag100,
          content: `$a ${testData.authoritySubfieldA} $d ${testData.authoritySubfieldD} $t ${testData.authoritySubfieldT_Original} $m ${testData.authoritySubfieldM} $n ${testData.authoritySubfieldN} $r ${testData.authoritySubfieldR}`,
          indicators: ['1', '\\'],
        },
      ];

      const marcBibFields = [
        {
          tag: marcFieldTags.tag008,
          content: QuickMarcEditor.valid008ValuesInstance,
        },
        {
          tag: marcFieldTags.tag042,
          content: '$a pcc',
          indicators: ['\\', '\\'],
        },
        {
          tag: marcFieldTags.tag240,
          content: `$a ${testData.authoritySubfieldT_Original} $m ${testData.bib240SubfieldM} $k ${testData.bib240SubfieldK}`,
          indicators: ['1', '0'],
        },
        {
          tag: marcFieldTags.tag245,
          content: `$a ${testData.instanceTitle}`,
          indicators: ['1', '1'],
        },
      ];

      const linkedBibFieldOriginalContent = `$a ${testData.authoritySubfieldT_Original} $m ${testData.authoritySubfieldM} $n ${testData.authoritySubfieldN} $r ${testData.authoritySubfieldR}`;

      const updatedLinkedFieldData240 = [
        marcBibFields[2].tag,
        marcBibFields[2].indicators[0],
        marcBibFields[2].indicators[1],
        `$a ${testData.authoritySubfieldT_UpdatedByB} $m ${testData.authoritySubfieldM} $n ${testData.authoritySubfieldN} $r ${testData.authoritySubfieldR}`,
        '',
        `$0 ${testData.authorityNaturalId}`,
        '',
      ];

      let userA;
      let userB;
      let authorityId;
      let createdInstanceId;

      before('Create users, data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C376995_');

        // Create MARC Authority record
        MarcAuthorities.createMarcAuthorityViaAPI(
          testData.authorityNaturalId,
          '',
          marcAuthFields,
        ).then((id) => {
          authorityId = id;
        });

        // Create MARC Bib record
        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
          (instanceId) => {
            createdInstanceId = instanceId;
          },
        );

        // Wait for both records to be created, then link them via API
        cy.then(() => {
          QuickMarcEditor.linkMarcRecordsViaApi({
            bibId: createdInstanceId,
            authorityIds: [authorityId],
            bibFieldTags: [marcBibFields[2].tag],
            authorityFieldTags: [marcAuthFields[0].tag],
            finalBibFieldContents: [linkedBibFieldOriginalContent],
          });
        });

        // Create User A
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((userProperties) => {
          userA = userProperties;
        });

        // Create User B
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((userProperties) => {
          userB = userProperties;
        });
      });

      after('Delete users, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userA.userId);
        Users.deleteViaApi(userB.userId);
        InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        MarcAuthority.deleteViaAPI(authorityId);
      });

      it(
        'C376995 Updating "MARC Authority" record when linked "MARC bib" record is being edited by a different user (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C376995'] },
        () => {
          // Steps 1-4: User A logs in, searches for MARC bib record, opens for editing
          cy.login(userA.username, userA.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.checkExpectedMARCSource();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();

          // Steps 5-10: While User A has the bib record open, User B updates the linked authority record via API
          // This updates the $t subfield in authority 100 field, which automatically updates linked bib 240 field
          cy.getToken(userB.username, userB.password).then(() => {
            cy.getMarcRecordDataViaAPI(authorityId).then((marcData) => {
              const field100 = marcData.fields.find((f) => f.tag === marcFieldTags.tag100);
              // Update $t subfield value to updated version
              field100.content = `$a ${testData.authoritySubfieldA} $d ${testData.authoritySubfieldD} $t ${testData.authoritySubfieldT_UpdatedByB} $m ${testData.authoritySubfieldM} $n ${testData.authoritySubfieldN} $r ${testData.authoritySubfieldR}`;
              cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData).then(
                ({ status }) => {
                  expect(status).to.eq(202);
                  // Switch back to User A's token
                  cy.getToken(userA.username, userA.password);

                  // Steps 11-12: User A makes changes to 042 field, tries to save (will trigger conflict)
                  QuickMarcEditor.updateExistingField(
                    marcFieldTags.tag042,
                    `$a ${testData.bib042UpdatedByA}`,
                  );
                  QuickMarcEditor.checkContentByTag(
                    marcFieldTags.tag042,
                    `$a ${testData.bib042UpdatedByA}`,
                  );
                  QuickMarcEditor.pressSaveAndCloseButton();

                  // Step 12: Verify conflict detection message and link
                  QuickMarcEditor.verifyOptimisticLockingBanner();

                  // Step 13: User A clicks "View latest version" link
                  QuickMarcEditor.clickViewLatestVersionLink();

                  // Step 13 (expected): Three pane view with detail view for MARC bib record
                  InventoryInstance.waitLoading();
                  InventoryInstance.waitInstanceRecordViewOpened();
                  InventoryInstance.checkExpectedMARCSource();

                  // Steps 14-15: User A reopens record for editing and verifies linked field was updated
                  InventoryInstance.editMarcBibliographicRecord();
                  QuickMarcEditor.waitLoading();
                  // Verify 240 field now shows updated $t value from authority record
                  // When 240 links to 100, the $a value in bib 240 is replaced with $t value from auth 100
                  QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...updatedLinkedFieldData240);
                },
              );
            });
          });
        },
      );
    });
  });
});
