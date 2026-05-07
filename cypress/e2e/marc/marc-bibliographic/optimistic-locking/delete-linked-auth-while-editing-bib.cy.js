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
      const randomDigits = `397353${randomNDigitNumber(6)}`;

      const marcFieldTags = {
        tag001: '001',
        tag008: '008',
        tag110: '110',
        tag245: '245',
        tag610: '610',
      };

      const testData = {
        instanceTitle: `C397353_MarcBibInstance_${randomPostfix}`,
        instanceTitleUpdatedByA: `C397353_MarcBibInstance_Updated_${randomPostfix}`,
        authorityHeading: `AT_C397353_MarcAuthority_${randomPostfix}`,
        bibFieldIndex: 5,
        naturalId: `${randomLetters}${randomDigits}`,
      };

      const marcAuthFields = [
        {
          tag: marcFieldTags.tag110,
          content: `$a ${testData.authorityHeading}`,
          indicators: ['2', '\\'],
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
          tag: marcFieldTags.tag610,
          content: `$a ${testData.authorityHeading}`,
          indicators: ['2', '0'],
        },
      ];

      const linkedFieldData610 = {
        tag: marcFieldTags.tag610,
        finalBibFieldContent: `$a ${testData.authorityHeading}`,
      };

      let user;
      let authorityId;
      const createdRecordIDs = [];

      before('Create users, data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('C397353_');
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C397353_');

        // Create MARC Authority record
        MarcAuthorities.createMarcAuthorityViaAPI(testData.naturalId, '', marcAuthFields).then(
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
            bibFieldTags: [linkedFieldData610.tag],
            authorityFieldTags: [marcAuthFields[0].tag],
            finalBibFieldContents: [linkedFieldData610.finalBibFieldContent],
          });
        });

        // Create User
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
        ]).then((userProperties) => {
          user = userProperties;
        });
      });

      after('Delete users, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
      });

      it(
        'C397353 Delete linked "MARC Authority" record while "MARC Bib" record being edited (saved link) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C397353'] },
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
          // Verify field is linked
          QuickMarcEditor.verifyRowLinked(testData.bibFieldIndex, true);

          // Steps 2-3: While user has the bib record open in UI, authority record is deleted via API
          cy.then(() => {
            // Delete linked authority record
            MarcAuthority.deleteViaAPI(authorityId);
            cy.recurse(
              () => MarcAuthorities.getMarcAuthoritiesViaApi({
                query: `keyword="${testData.authorityHeading}" and authRefType=="Authorized"`,
              }),
              (foundAuthorities) => foundAuthorities.length === 0,
              { limit: 10, timeout: 12000, delay: 1000 },
            );
          }).then(() => {
            // Step 4: User makes changes to 245 field, tries to save (will trigger conflict)
            QuickMarcEditor.updateExistingField(
              marcFieldTags.tag245,
              `$a ${testData.instanceTitleUpdatedByA}`,
            );
            QuickMarcEditor.checkContentByTag(
              marcFieldTags.tag245,
              `$a ${testData.instanceTitleUpdatedByA}`,
            );
            QuickMarcEditor.clickSaveAndKeepEditingButton();

            // Step 4 (expected): Verify conflict detection message and link
            QuickMarcEditor.verifyOptimisticLockingBanner();

            // Step 5: User clicks "View latest version" link
            QuickMarcEditor.clickViewLatestVersionLink();

            // Step 5 (expected): Three pane view with detail view for MARC bib record
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();
            InventoryInstance.checkInstanceTitle(testData.instanceTitle);

            // Step 6: User reopens record for editing and verifies field was unlinked
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.waitLoading();

            // Verify bib 610 field was unlinked (because linked authority was deleted)
            QuickMarcEditor.verifyRowLinked(testData.bibFieldIndex, false);
          });
        },
      );
    });
  });
});
