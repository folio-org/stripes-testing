import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../../support/utils/stringTools';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(15);
      const testData = {
        nonControllableSubfield1: '$e artist',
        nonControllableSubfield2: '$e colorist',
        tag008: '008',
        tag100: '100',
        tag245: '245',
        tag700: '700',
        contributorSectionId: 'list-contributors',
        tag700Index: 5,
      };
      const instanceTitle = `AT_C366121_MarcBibInstance_${randomPostfix}`;
      const authorityHeading1 = `AT_C366121_MarcAuthority_${randomPostfix}_1`;
      const authorityHeading2 = `AT_C366121_MarcAuthority_${randomPostfix}_2 (Comic book artist)`;

      const authData = { prefix: randomLetters, startWithNumber: 1 };

      const authorityFields1 = [
        {
          tag: testData.tag100,
          content: `$a ${authorityHeading1}`,
          indicators: ['1', '\\'],
        },
      ];
      const authorityFields2 = [
        {
          tag: testData.tag100,
          content: `$a AT_C366121_MarcAuthority_${randomPostfix}_2 $c (Comic book artist)`,
          indicators: ['1', '\\'],
        },
      ];

      const marcBibFields = [
        {
          tag: testData.tag008,
          content: QuickMarcEditor.valid008ValuesInstance,
        },
        {
          tag: testData.tag245,
          content: `$a ${instanceTitle}`,
          indicators: ['1', '1'],
        },
        {
          tag: testData.tag700,
          content: `${authorityFields1[0].content} ${testData.nonControllableSubfield1}`,
          indicators: ['1', '\\'],
        },
        {
          tag: testData.tag700,
          content: `${authorityFields2[0].content} ${testData.nonControllableSubfield2}`,
          indicators: ['1', '\\'],
        },
      ];

      const fieldAfterUnlinking1 = [
        testData.tag700Index,
        marcBibFields[2].tag,
        marcBibFields[2].indicators[0],
        marcBibFields[2].indicators[1],
        `${authorityFields1[0].content} ${testData.nonControllableSubfield1} $0 ${authData.prefix}${authData.startWithNumber}`,
      ];

      const fieldAfterUnlinking2 = [
        testData.tag700Index + 1,
        marcBibFields[3].tag,
        marcBibFields[3].indicators[0],
        marcBibFields[3].indicators[1],
        `${authorityFields2[0].content} ${testData.nonControllableSubfield2} $0 ${authData.prefix}${authData.startWithNumber + 1}`,
      ];

      const user = {};
      const createdAuthorityIds = [];
      let createdInstanceId;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C366121');
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C366121');

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((createdUserProperties) => {
          user.userProperties = createdUserProperties;

          cy.then(() => {
            cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
              (instanceId) => {
                createdInstanceId = instanceId;
              },
            );
            MarcAuthorities.createMarcAuthorityViaAPI(
              authData.prefix,
              authData.startWithNumber,
              authorityFields1,
            ).then((createdRecordId) => {
              createdAuthorityIds.push(createdRecordId);
            });
            MarcAuthorities.createMarcAuthorityViaAPI(
              authData.prefix,
              authData.startWithNumber + 1,
              authorityFields2,
            ).then((createdRecordId) => {
              createdAuthorityIds.push(createdRecordId);
            });
          })
            .then(() => {
              QuickMarcEditor.linkMarcRecordsViaApi({
                bibId: createdInstanceId,
                authorityIds: createdAuthorityIds,
                bibFieldTags: [testData.tag700, testData.tag700],
                authorityFieldTags: [testData.tag100, testData.tag100],
                finalBibFieldContents: [
                  `${authorityFields1[0].content} ${testData.nonControllableSubfield1}`,
                  `${authorityFields2[0].content} ${testData.nonControllableSubfield2}`,
                ],
                bibFieldIndexes: [testData.tag700Index, testData.tag700Index + 1],
              });
            })
            .then(() => {
              cy.login(user.userProperties.username, user.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userProperties.userId);
        createdAuthorityIds.forEach((authorityId) => {
          MarcAuthority.deleteViaAPI(authorityId, true);
        });
        InventoryInstances.deleteInstanceByTitleViaApi(instanceTitle);
      });

      it(
        'C366121 Derive a new MARC bib record: Unlink "MARC Bibliographic" fields from "MARC Authority" records using "ENTER" hot key in "Remove authority linking" modal (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C366121'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.deriveNewMarcBibRecord();
          QuickMarcEditor.verifyRemoveLinkingModal();

          QuickMarcEditor.confirmRemoveAuthorityLinkingWithEnterKey();
          QuickMarcEditor.verifyRemoveLinkingModalAbsence();
          QuickMarcEditor.checkLinkButtonExistByRowIndex(5);
          QuickMarcEditor.checkLinkButtonExistByRowIndex(6);
          QuickMarcEditor.verifySaveAndCloseButtonEnabled();

          QuickMarcEditor.verifyTagFieldAfterUnlinking(...fieldAfterUnlinking1);
          QuickMarcEditor.verifyTagFieldAfterUnlinking(...fieldAfterUnlinking2);

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkAfterSaveAndCloseDerive();

          InventoryInstance.checkAuthorityAppIconInSection(
            testData.contributorSectionId,
            authorityHeading1,
            false,
          );
          InventoryInstance.checkAuthorityAppIconInSection(
            testData.contributorSectionId,
            authorityHeading2,
            false,
          );

          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyTagFieldAfterUnlinking(...fieldAfterUnlinking1);
          QuickMarcEditor.verifyTagFieldAfterUnlinking(...fieldAfterUnlinking2);
        },
      );
    });
  });
});
