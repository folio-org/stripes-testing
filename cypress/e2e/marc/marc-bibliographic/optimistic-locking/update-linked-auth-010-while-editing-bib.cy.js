import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Optimistic locking', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = `397340${randomNDigitNumber(18)}`;

      const marcFieldTags = {
        tag001: '001',
        tag008: '008',
        tag010: '010',
        tag100: '100',
        tag130: '130',
        tag245: '245',
        tag830: '830',
      };

      const testData = {
        authority1NaturalId: `n${randomDigits}1`,
        authority1_010a_UpdatedByB: `n${randomDigits}2`,
        authority2NaturalId: `n${randomDigits}3`,
        authority2_010a_UpdatedByB_NoPrefix: `${randomDigits}2`,
        authority1_001: `n${randomDigits}4`,
        authority2_001: `n${randomDigits}5`,
        sourceUrlPrefix: 'http://id.loc.gov/authorities/names/',
        instanceTitle: `AT_C397340_MarcBibInstance_${randomPostfix}`,
        instanceTitleUpdatedByA: `AT_C397340_MarcBibInstance_${randomPostfix}_Updated`,
        authority1Heading: `AT_C397340_MarcAuthority1_${randomPostfix}`,
        authority2Heading: `AT_C397340_MarcAuthority2_${randomPostfix}`,
      };

      const marcAuth1Fields = [
        {
          tag: marcFieldTags.tag010,
          content: `$a ${testData.authority1NaturalId}`,
          indicators: ['\\', '\\'],
        },
        {
          tag: marcFieldTags.tag100,
          content: `$a ${testData.authority1Heading}`,
          indicators: ['1', '\\'],
        },
      ];

      const marcAuth2Fields = [
        {
          tag: marcFieldTags.tag010,
          content: `$a ${testData.authority2NaturalId}`,
          indicators: ['\\', '\\'],
        },
        {
          tag: marcFieldTags.tag130,
          content: `$a ${testData.authority2Heading}`,
          indicators: ['\\', '\\'],
        },
      ];

      const marcBibFields = [
        {
          tag: marcFieldTags.tag008,
          content: QuickMarcEditor.valid008ValuesInstance,
        },
        {
          tag: marcFieldTags.tag100,
          content: `$a ${testData.authority1Heading}`,
          indicators: ['1', '\\'],
        },
        {
          tag: marcFieldTags.tag245,
          content: `$a ${testData.instanceTitle}`,
          indicators: ['1', '1'],
        },
        {
          tag: marcFieldTags.tag830,
          content: `$a ${testData.authority2Heading}`,
          indicators: ['\\', '0'],
        },
      ];

      const linkedFieldData100 = {
        tag: marcFieldTags.tag100,
        finalBibFieldContent: `$a ${testData.authority1Heading}`,
      };

      const linkedFieldData830 = {
        tag: marcFieldTags.tag830,
        finalBibFieldContent: `$a ${testData.authority2Heading}`,
      };

      const initialLinkedFieldData100 = [
        marcFieldTags.tag100,
        marcBibFields[1].indicators[0],
        marcBibFields[1].indicators[1],
        `$a ${testData.authority1Heading}`,
        '',
        `$0 ${testData.sourceUrlPrefix}${testData.authority1NaturalId}`,
        '',
      ];

      const initialLinkedFieldData830 = [
        marcFieldTags.tag830,
        marcBibFields[3].indicators[0],
        marcBibFields[3].indicators[1],
        `$a ${testData.authority2Heading}`,
        '',
        `$0 ${testData.sourceUrlPrefix}${testData.authority2NaturalId}`,
        '',
      ];

      const updatedLinkedFieldData100 = [
        marcFieldTags.tag100,
        marcBibFields[1].indicators[0],
        marcBibFields[1].indicators[1],
        `$a ${testData.authority1Heading}`,
        '',
        `$0 ${testData.sourceUrlPrefix}${testData.authority1_010a_UpdatedByB}`,
        '',
      ];

      const updatedLinkedFieldData830 = [
        marcFieldTags.tag830,
        marcBibFields[3].indicators[0],
        marcBibFields[3].indicators[1],
        `$a ${testData.authority2Heading}`,
        '',
        `$0 ${testData.sourceUrlPrefix}${testData.authority2_001}`,
        '',
      ];

      let user;
      let authority1Id;
      let authority2Id;
      const createdRecordIDs = [];

      before('Create users, data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('C397340_');
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C397340_');

        // Create first MARC Authority record with 010 $a (valid prefix)
        MarcAuthorities.createMarcAuthorityViaAPI(
          testData.authority1_001,
          '',
          marcAuth1Fields,
        ).then((id) => {
          authority1Id = id;
        });

        // Create second MARC Authority record with 010 $a (valid prefix) and specific 001
        MarcAuthorities.createMarcAuthorityViaAPI(
          testData.authority2_001,
          '',
          marcAuth2Fields,
        ).then((id) => {
          authority2Id = id;
        });

        // Create MARC Bib record
        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
          (instanceId) => {
            createdRecordIDs.push(instanceId);
          },
        );

        // Wait for both authorities and bib to be created, then link them via API
        cy.then(() => {
          QuickMarcEditor.linkMarcRecordsViaApi({
            bibId: createdRecordIDs[0],
            authorityIds: [authority1Id, authority2Id],
            bibFieldTags: [linkedFieldData100.tag, linkedFieldData830.tag],
            authorityFieldTags: [marcAuth1Fields[1].tag, marcAuth2Fields[1].tag],
            finalBibFieldContents: [
              linkedFieldData100.finalBibFieldContent,
              linkedFieldData830.finalBibFieldContent,
            ],
          });
        });

        // Create User
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((userProperties) => {
          user = userProperties;
        });
      });

      after('Delete users, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
        MarcAuthority.deleteViaAPI(authority1Id);
        MarcAuthority.deleteViaAPI(authority2Id);
      });

      it(
        'C397340 Updating "010 $a" value in linked "MARC authority" record while "MARC Bib" record being edited (saved link; "$0" = "010 $a") (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C397340'] },
        () => {
          // Step 1: User logs in, searches for MARC bib record, opens for editing
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstanceById(createdRecordIDs[0]);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();
          // Verify initial $0 values in linked fields
          QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...initialLinkedFieldData100);
          QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...initialLinkedFieldData830);

          // Steps 2-8: While user has the bib record open in UI, authority records are updated via API
          cy.then(() => {
            // Update first authority: change 010 $a but keep valid prefix
            cy.getMarcRecordDataViaAPI(authority1Id).then((marcData) => {
              const field010 = marcData.fields.find((f) => f.tag === marcFieldTags.tag010);
              field010.content = `$a ${testData.authority1_010a_UpdatedByB}`;
              marcData.relatedRecordVersion = 1;
              cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData).then(
                ({ status }) => {
                  expect(status).to.eq(202);
                },
              );
            });

            // Update second authority: change 010 $a and remove valid prefix
            cy.getMarcRecordDataViaAPI(authority2Id).then((marcData) => {
              const field010 = marcData.fields.find((f) => f.tag === marcFieldTags.tag010);
              field010.content = `$a ${testData.authority2_010a_UpdatedByB_NoPrefix}`;
              marcData.relatedRecordVersion = 1;
              cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData).then(
                ({ status }) => {
                  expect(status).to.eq(202);
                },
              );
            });
          }).then(() => {
            // Step 9: User makes changes to 245 field, tries to save (will trigger conflict)
            QuickMarcEditor.updateExistingField(
              marcFieldTags.tag245,
              `$a ${testData.instanceTitleUpdatedByA}`,
            );
            QuickMarcEditor.checkContentByTag(
              marcFieldTags.tag245,
              `$a ${testData.instanceTitleUpdatedByA}`,
            );
            QuickMarcEditor.pressSaveAndCloseButton();

            // Step 9 (expected): Verify conflict detection message and link
            QuickMarcEditor.verifyOptimisticLockingBanner();

            // Step 10: User A clicks "View latest version" link
            QuickMarcEditor.clickViewLatestVersionLink();

            // Step 10 (expected): Three pane view with detail view for MARC bib record
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();

            // Step 11: User reopens record for editing and verifies linked fields were updated
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.waitLoading();

            // Verify bib 100 $0 updated to new auth1 010 $a value (still has valid prefix)
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...updatedLinkedFieldData100);

            // Verify bib 830 $0 updated to auth2 001 value (because 010 $a no longer has valid prefix)
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...updatedLinkedFieldData830);
          });
        },
      );
    });
  });
});
