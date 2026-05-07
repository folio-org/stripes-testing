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
      const randomDigits = `397342${randomNDigitNumber(18)}`;

      const marcFieldTags = {
        tag001: '001',
        tag008: '008',
        tag010: '010',
        tag150: '150',
        tag245: '245',
        tag650: '650',
      };

      const testData = {
        authorityNaturalId: `sh${randomDigits}1`, // valid prefix "sh" for Subject Heading
        authority_010a_UpdatedByB_NoPrefix: `${randomDigits}1`, // no prefix
        authority_001: `${randomDigits}2`, // 001 without valid prefix
        sourceUrlPrefix: 'http://id.loc.gov/authorities/subjects/',
        instanceTitle: `C397342_MarcBibInstance_${randomPostfix}`,
        instanceTitleUpdatedByA: `C397342_MarcBibInstance_Updated_${randomPostfix}`,
        authorityHeading: `AT_C397342_MarcAuthority_${randomPostfix}`,
      };

      const marcAuthFields = [
        {
          tag: marcFieldTags.tag010,
          content: `$a ${testData.authorityNaturalId}`,
          indicators: ['\\', '\\'],
        },
        {
          tag: marcFieldTags.tag150,
          content: `$a ${testData.authorityHeading}`,
          indicators: ['\\', '\\'],
        },
      ];

      const marcBibFields = [
        {
          tag: marcFieldTags.tag008,
          content: QuickMarcEditor.valid008ValuesInstance,
        },
        {
          tag: marcFieldTags.tag245,
          content: `$a ${testData.instanceTitle}`,
          indicators: ['1', '0'],
        },
        {
          tag: marcFieldTags.tag650,
          content: `$a ${testData.authorityHeading}`,
          indicators: ['\\', '0'],
        },
      ];

      const linkedFieldData650 = {
        tag: marcFieldTags.tag650,
        finalBibFieldContent: `$a ${testData.authorityHeading}`,
      };

      const initialLinkedFieldData650 = [
        marcFieldTags.tag650,
        marcBibFields[2].indicators[0],
        marcBibFields[2].indicators[1],
        `$a ${testData.authorityHeading}`,
        '',
        `$0 ${testData.sourceUrlPrefix}${testData.authorityNaturalId}`,
        '',
      ];

      const updatedLinkedFieldData650 = [
        marcFieldTags.tag650,
        marcBibFields[2].indicators[0],
        marcBibFields[2].indicators[1],
        `$a ${testData.authorityHeading}`,
        '',
        `$0 ${testData.authority_001}`,
        '',
      ];

      let user;
      let authorityId;
      const createdRecordIDs = [];

      before('Create users, data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('C397342_');
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C397342_');

        // Create MARC Authority record with 001 without valid prefix, 010 $a with valid prefix
        MarcAuthorities.createMarcAuthorityViaAPI(testData.authority_001, '', marcAuthFields).then(
          (id) => {
            authorityId = id;
          },
        );

        // Create MARC Bib record
        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
          (instanceId) => {
            createdRecordIDs.push(instanceId);
          },
        );

        // Wait for authority and bib to be created, then link them via API
        cy.then(() => {
          QuickMarcEditor.linkMarcRecordsViaApi({
            bibId: createdRecordIDs[0],
            authorityIds: [authorityId],
            bibFieldTags: [linkedFieldData650.tag],
            authorityFieldTags: [marcAuthFields[1].tag],
            finalBibFieldContents: [linkedFieldData650.finalBibFieldContent],
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
        MarcAuthority.deleteViaAPI(authorityId);
      });

      it(
        'C397342 Updating "010 $a" value by removing valid prefix in linked "MARC Authority" record while "MARC Bib" record being edited (saved link; "$0" = "010 $a") (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C397342'] },
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
          // Verify initial $0 value in linked field (with valid prefix)
          QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...initialLinkedFieldData650);

          // Steps 2-4: While user has the bib record open in UI, authority record is updated via API
          cy.then(() => {
            // Update authority: change 010 $a and remove valid prefix
            cy.getMarcRecordDataViaAPI(authorityId).then((marcData) => {
              const field010 = marcData.fields.find((f) => f.tag === marcFieldTags.tag010);
              field010.content = `$a ${testData.authority_010a_UpdatedByB_NoPrefix}`;
              marcData.relatedRecordVersion = 1;
              cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData).then(
                ({ status }) => {
                  expect(status).to.eq(202);
                },
              );
            });
            cy.wait(2000);
          }).then(() => {
            // Step 5: User makes changes to 245 field, tries to save (will trigger conflict)
            QuickMarcEditor.updateExistingField(
              marcFieldTags.tag245,
              `$a ${testData.instanceTitleUpdatedByA}`,
            );
            QuickMarcEditor.checkContentByTag(
              marcFieldTags.tag245,
              `$a ${testData.instanceTitleUpdatedByA}`,
            );
            QuickMarcEditor.pressSaveAndCloseButton();

            // Step 5 (expected): Verify conflict detection message and link
            QuickMarcEditor.verifyOptimisticLockingBanner();

            // Step 6: User A clicks "View latest version" link
            QuickMarcEditor.clickViewLatestVersionLink();

            // Step 6 (expected): Three pane view with detail view for MARC bib record
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();
            InventoryInstance.checkInstanceTitle(testData.instanceTitle);

            // Step 7: User reopens record for editing and verifies linked field was updated
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.waitLoading();

            // Verify bib 650 $0 updated to auth 001 value (because 010 $a no longer has valid prefix)
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...updatedLinkedFieldData650);
          });
        },
      );
    });
  });
});
