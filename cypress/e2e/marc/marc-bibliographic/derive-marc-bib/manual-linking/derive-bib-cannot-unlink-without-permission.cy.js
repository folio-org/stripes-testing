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
        authorityHeading: `AT_C366531_MarcAuthority_${randomPostfix}`,
        instanceTitle: `AT_C366529_MarcBibInstance_${randomPostfix}`,
        contributorValue: `AT_C366529_Contributor_${randomPostfix}`,
        nonControllableSubfield: '$e artist.',
        tag008: '008',
        tag100: '100',
        tag245: '245',
        tag700: '700',
        contributorSectionId: 'list-contributors',
        tag700Index: 5,
      };

      const authData = { prefix: randomLetters, startWithNumber: '1' };

      const authorityFields = [
        {
          tag: testData.tag100,
          content: `$a ${testData.authorityHeading}`,
          indicators: ['2', '\\'],
        },
      ];

      const linkedFieldData = {
        tag: testData.tag700,
        ind1: '2',
        ind2: '\\',
        controlledLetterSubfields: `$a ${testData.authorityHeading}`,
        uncontrolledLetterSubfields: testData.nonControllableSubfield,
        controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber}`,
        uncontrolledDigitSubfields: '',
      };

      const newTitle = `${testData.instanceTitle}_upd`;

      const marcBibFields = [
        {
          tag: testData.tag008,
          content: QuickMarcEditor.defaultValid008Values,
        },
        {
          tag: testData.tag245,
          content: `$a ${testData.instanceTitle}`,
          indicators: ['1', '1'],
        },
        {
          tag: testData.tag700,
          content: `$a ${testData.contributorValue} ${testData.nonControllableSubfield}`,
          indicators: ['2', '\\'],
        },
      ];

      const user = {};
      let createdAuthorityId;
      const createdInstanceIds = [];

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C366531_MarcAuthority');

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        ]).then((createdUserProperties) => {
          user.userProperties = createdUserProperties;

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
              createdAuthorityId = createdRecordId;
            });
          })
            .then(() => {
              QuickMarcEditor.linkMarcRecordsViaApi({
                bibId: createdInstanceIds[0],
                authorityId: createdAuthorityId,
                bibFieldTag: testData.tag700,
                authorityFieldTag: testData.tag100,
                finalBibFieldContent: `$a ${testData.authorityHeading} ${testData.nonControllableSubfield}`,
              });
            })
            .then(() => {
              cy.waitForAuthRefresh(() => {
                cy.login(user.userProperties.username, user.userProperties.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                });
              });
            });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userProperties.userId);
        MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        InventoryInstances.deleteInstanceByTitleViaApi(testData.instanceTitle);
      });

      it(
        'C366529 Verify that user without permission can\'t unlink "MARC Bib" field from "MARC Authority" record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C366529'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceIds[0]);
          InventoryInstances.selectInstanceById(createdInstanceIds[0]);
          InventoryInstance.waitLoading();
          InventoryInstance.deriveNewMarcBibRecord();

          QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData));
          QuickMarcEditor.checkUnlinkButtonShown(testData.tag700, false);
          QuickMarcEditor.clickViewMarcAuthorityIconInTagField(testData.tag700Index);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(testData.authorityHeading);

          InventoryInstance.goToPreviousPage();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.updateExistingField(testData.tag245, newTitle);

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseDerive();
          InventoryInstance.verifyInstanceTitle(newTitle);
          InventoryInstance.checkAuthorityAppIconInSection(
            testData.contributorSectionId,
            testData.authorityHeading,
            true,
          );

          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData));
          QuickMarcEditor.checkUnlinkButtonShown(testData.tag700, false);
        },
      );
    });
  });
});
