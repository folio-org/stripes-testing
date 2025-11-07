import { Permissions } from '../../../../../support/dictionary';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        user: {},
        tags: {
          tag008: '008',
          tag110: '110',
          tag024: '024',
          tag042: '042',
          tag245: '245',
          tag518: '518',
        },
        fieldIndexes: {
          tag024: 4,
          tag042: 5,
          tag110: 6,
          tag518: 8,
        },
        authorityHeading: `AT_C375114_MarcAuthority_${randomPostfix}`,
        bibTitle: `AT_C375114_MarcBibInstance_${randomPostfix}`,
        messages: {
          fieldLinked: 'Field 110 has been linked to a MARC authority record.',
          failInvalidSubfield: 'Fail: $9 is an invalid subfield for linkable bibliographic fields.',
          failNonRepeatable: "Fail: Subfield '9' is non-repeatable.",
          subfieldUndefined: "Subfield '9' is undefined.",
        },
      };

      const initialBibFieldContents = {
        tag024: '$a 5099969945120 $q (box set)',
        tag042: '$a lccopycat',
        tag110: '$a Field 110',
        tag245: `$a ${testData.bibTitle}`,
        tag518: '$a Recorded 1962-1970',
      };

      const newValues = {
        fifthBox: '$9 test',
        seventhBox: '$9 test',
        field024: `${initialBibFieldContents.tag024} $9 test`,
        field042: `${initialBibFieldContents.tag042} $9 test`,
        field518: `${initialBibFieldContents.tag518} $9 test $9 TEST`,
      };

      const marcBibFields = [
        {
          tag: testData.tags.tag008,
          content: QuickMarcEditor.defaultValid008Values,
        },
        {
          tag: testData.tags.tag024,
          content: initialBibFieldContents.tag024,
          indicators: ['\\', '\\'],
        },
        {
          tag: testData.tags.tag042,
          content: initialBibFieldContents.tag042,
          indicators: ['\\', '\\'],
        },
        {
          tag: testData.tags.tag110,
          content: initialBibFieldContents.tag110,
          indicators: ['\\', '\\'],
        },
        {
          tag: testData.tags.tag245,
          content: initialBibFieldContents.tag245,
          indicators: ['1', '1'],
        },
        {
          tag: testData.tags.tag518,
          content: initialBibFieldContents.tag518,
          indicators: ['\\', '\\'],
        },
      ];

      const authData = {
        prefix: getRandomLetters(15),
        startWithNumber: '1',
      };

      const authorityFields = [
        {
          tag: testData.tags.tag110,
          content: `$a ${testData.authorityHeading}`,
          indicators: ['1', '\\'],
        },
      ];

      const linkedFieldData = [
        testData.tags.tag110,
        '\\',
        '\\',
        `$a ${testData.authorityHeading}`,
        '',
        `$0 ${authData.prefix}${authData.startWithNumber}`,
        '',
      ];

      const sourceViewContents = {
        linkedField110: `Linked to MARC authority\n\t110\t   \t$a ${testData.authorityHeading} $0 ${authData.prefix}${authData.startWithNumber} $9`,
        field024: `\t024\t   \t${newValues.field024}`,
        field042: `\t042\t   \t${newValues.field042}`,
        field518: `\t518\t   \t${newValues.field518}`,
      };

      let createdAuthorityId;
      const createdInstanceIds = [];

      before('Create user and test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C375114_MarcAuthority');

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
        ]).then((createdUserProperties) => {
          testData.user = createdUserProperties;

          cy.then(() => {
            MarcAuthorities.createMarcAuthorityViaAPI(
              authData.prefix,
              authData.startWithNumber,
              authorityFields,
            ).then((createdRecordId) => {
              createdAuthorityId = createdRecordId;
            });

            cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
              (instanceId) => {
                createdInstanceIds.push(instanceId);
              },
            );
          }).then(() => {
            cy.waitForAuthRefresh(() => {
              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            }, 20_000);
            InventoryInstances.searchByTitle(createdInstanceIds[0]);
            InventoryInstances.selectInstanceById(createdInstanceIds[0]);
            InventoryInstance.waitLoading();
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        createdInstanceIds.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(createdAuthorityId, true);
      });

      it(
        'C375114 Subfield "$9" presence validation when linking "MARC Bibliographic" record in editing window (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C375114'] },
        () => {
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.updateLDR06And07Positions();

          QuickMarcEditor.clickLinkIconInTagFieldByTag(testData.tags.tag110);
          InventoryInstance.verifySelectMarcAuthorityModal();
          MarcAuthorities.switchToSearch();
          MarcAuthorities.verifySearchTabIsOpened();
          MarcAuthorities.searchBeats(testData.authorityHeading);
          MarcAuthority.waitLoading();
          InventoryInstance.clickLinkButton();
          QuickMarcEditor.checkCallout(testData.messages.fieldLinked);
          QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...linkedFieldData);

          QuickMarcEditor.fillLinkedFieldBox(testData.fieldIndexes.tag110, 5, newValues.fifthBox);

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(
            testData.fieldIndexes.tag110,
            testData.messages.failInvalidSubfield,
          );
          QuickMarcEditor.checkErrorMessage(
            testData.fieldIndexes.tag110,
            testData.messages.failNonRepeatable,
          );
          QuickMarcEditor.verifyValidationCallout();
          QuickMarcEditor.closeAllCallouts();

          QuickMarcEditor.fillLinkedFieldBox(testData.fieldIndexes.tag110, 5, '');
          QuickMarcEditor.fillLinkedFieldBox(testData.fieldIndexes.tag110, 7, newValues.seventhBox);

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(
            testData.fieldIndexes.tag110,
            testData.messages.failInvalidSubfield,
          );
          QuickMarcEditor.checkErrorMessage(
            testData.fieldIndexes.tag110,
            testData.messages.failNonRepeatable,
          );
          QuickMarcEditor.verifyValidationCallout();
          QuickMarcEditor.closeAllCallouts();

          QuickMarcEditor.fillLinkedFieldBox(testData.fieldIndexes.tag110, 7, '');
          QuickMarcEditor.updateExistingField(testData.tags.tag024, newValues.field024);
          QuickMarcEditor.updateExistingField(testData.tags.tag042, newValues.field042);
          QuickMarcEditor.updateExistingField(testData.tags.tag518, newValues.field518);

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkErrorMessage(
            testData.fieldIndexes.tag024,
            testData.messages.subfieldUndefined,
          );
          QuickMarcEditor.checkErrorMessage(
            testData.fieldIndexes.tag042,
            testData.messages.subfieldUndefined,
          );
          QuickMarcEditor.checkErrorMessage(
            testData.fieldIndexes.tag518,
            testData.messages.subfieldUndefined,
          );
          QuickMarcEditor.verifyValidationCallout();

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();

          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...linkedFieldData);
          QuickMarcEditor.checkContentByTag(testData.tags.tag024, newValues.field024);
          QuickMarcEditor.checkContentByTag(testData.tags.tag042, newValues.field042);
          QuickMarcEditor.checkContentByTag(testData.tags.tag518, newValues.field518);

          QuickMarcEditor.closeEditorPane();
          InventoryInstance.viewSource();

          InventoryViewSource.contains(sourceViewContents.linkedField110);
          InventoryViewSource.contains(sourceViewContents.field024);
          InventoryViewSource.contains(sourceViewContents.field042);
          InventoryViewSource.contains(sourceViewContents.field518);
        },
      );
    });
  });
});
