import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomFourDigitNumber,
} from '../../../../../support/utils/stringTools';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(15);
      const randomDigits = randomFourDigitNumber();
      const testData = {
        authorityHeading: `AT_C365600_MarcAuthority_${randomPostfix} 1972-`,
        authority100FieldContent: `$a AT_C365600_MarcAuthority_${randomPostfix} $d 1972-`,
        instanceTitle: `AT_C365600_MarcBibInstance_${randomPostfix}`,
        instance100FieldContent: `$a AT_C365600_Contributor_${randomPostfix} $e Author $e Narrator $d 1972- $1 http://viaf.org/viaf/24074052`,
        nonControllableAlpha: '$e Author $e Narrator',
        nonControllableNumerical: '$1 http://viaf.org/viaf/24074052',
        tag008: '008',
        tag100: '100',
        tag245: '245',
        tag100Index: 5,
        unlinkTooltipText: 'Unlink from MARC Authority record',
        contributorSectionId: 'list-contributors',
        contributorValue: `AT_C365600_MarcAuthority_${randomPostfix} 1972-`,
      };

      const authData = {
        prefix: randomLetters,
        startWithNumber: `365600${randomDigits}${randomDigits}`,
      };

      const authorityFields = [
        {
          tag: testData.tag100,
          content: testData.authority100FieldContent,
          indicators: ['1', '\\'],
        },
      ];

      const linkedFieldData = {
        tag: testData.tag100,
        ind1: '1',
        ind2: '\\',
        controlledLetterSubfields: testData.authority100FieldContent,
        uncontrolledLetterSubfields: testData.nonControllableAlpha,
        controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber}`,
        uncontrolledDigitSubfields: testData.nonControllableNumerical,
      };

      const unlinkedFieldContent = `${testData.authority100FieldContent} ${testData.nonControllableAlpha} ${testData.nonControllableNumerical} $0 ${authData.prefix}${authData.startWithNumber}`;

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
          tag: testData.tag100,
          content: testData.instance100FieldContent,
          indicators: ['1', '\\'],
        },
      ];

      const user = {};
      let createdAuthorityId;
      let createdInstanceId;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C365600_MarcAuthority');

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
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
              authorityFields,
            ).then((createdRecordId) => {
              createdAuthorityId = createdRecordId;
            });
          })
            .then(() => {
              QuickMarcEditor.linkMarcRecordsViaApi({
                bibId: createdInstanceId,
                authorityIds: [createdAuthorityId],
                bibFieldTags: [testData.tag100],
                authorityFieldTags: [testData.tag100],
                finalBibFieldContents: [
                  `${testData.authority100FieldContent} ${testData.nonControllableAlpha} ${testData.nonControllableNumerical}`,
                ],
              });
            })
            .then(() => {
              cy.login(user.userProperties.username, user.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
                authRefresh: true,
              });
            });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userProperties.userId);
        MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        InventoryInstances.deleteInstanceByTitleViaApi(createdInstanceId);
      });

      it(
        'C365600 Unlink "MARC Bibliographic" field from "MARC Authority" record and use the "Cancel" button in editing window (100 field to 100). (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C365600'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.editMarcBibliographicRecord();

          QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData));
          QuickMarcEditor.checkUnlinkButtonShown(testData.tag100);
          QuickMarcEditor.checkUnlinkTooltipText(testData.tag100Index, testData.unlinkTooltipText);
          QuickMarcEditor.clickUnlinkIconInTagField(testData.tag100Index);
          QuickMarcEditor.checkUnlinkModal(testData.tag100);
          QuickMarcEditor.confirmUnlinkingField();
          QuickMarcEditor.verifyTagFieldAfterUnlinkingByTag(
            testData.tag100,
            linkedFieldData.ind1,
            linkedFieldData.ind2,
            unlinkedFieldContent,
          );
          QuickMarcEditor.verifyAllBoxesInARowAreEditable(testData.tag100);

          QuickMarcEditor.pressCancel();
          QuickMarcEditor.cancelEditConfirmationPresented();
          QuickMarcEditor.closeWithoutSavingInEditConformation();
          InventoryInstance.waitLoading();
          InventoryInstance.checkAuthorityAppIconInSection(
            testData.contributorSectionId,
            testData.contributorValue,
            true,
          );

          InventoryInstance.viewSource();
          InventoryViewSource.verifyLinkedToAuthorityIcon(testData.tag100Index);
        },
      );
    });
  });
});
