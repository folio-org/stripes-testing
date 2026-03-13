import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../../../support/utils/stringTools';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        const randomPostfix = getRandomPostfix();
        const randomLetters = getRandomLetters(15);
        const randomDigits = randomNDigitNumber(8);
        const testData = {
          authoritySubfieldA: `AT_C375085_MarcAuthority_${randomPostfix}`,
          authoritySubfieldT: 'Bartholomew world travel series',
          authoritySubfieldD: '1995',
          authoritySubfieldL: 'English',
          authoritySubfieldE: 'show',
          authoritySubfield5: '810',
          instanceTitle: `AT_C375085_MarcBibInstance_${randomPostfix}`,
          instanceSubfieldA: `AT_C375085_Field810_${randomPostfix}`,
          instanceSubfieldT: 'world travel ser-s.',
          instanceSubfieldX: '810',
          instanceSubfieldE: 'map',
          tag008: '008',
          tag110: '110',
          tag245: '245',
          tag810: '810',
          titleDataAccordionName: 'Title data',
          linkedIconText: 'Linked to MARC authority',
        };
        const authorityHeading = `${testData.authoritySubfieldA} ${testData.authoritySubfieldT} ${testData.authoritySubfieldD} ${testData.authoritySubfieldL}`;
        const authData = {
          prefix: randomLetters,
          startWithNumber: `375085${randomDigits}${randomDigits}`,
        };
        const authorityFields = [
          {
            tag: testData.tag110,
            content: `$a ${testData.authoritySubfieldA} $t ${testData.authoritySubfieldT} $d ${testData.authoritySubfieldD} $l ${testData.authoritySubfieldL} $e ${testData.authoritySubfieldE} $5 ${testData.authoritySubfield5}`,
            indicators: ['2', '0'],
          },
        ];
        const marcBibFields = [
          {
            tag: testData.tag008,
            content: QuickMarcEditor.valid008ValuesInstance,
          },
          {
            tag: testData.tag245,
            content: `$a ${testData.instanceTitle}`,
            indicators: ['1', '1'],
          },
          {
            tag: testData.tag810,
            content: `$a ${testData.instanceSubfieldA} $t ${testData.instanceSubfieldT} $x ${testData.instanceSubfieldX} $e ${testData.instanceSubfieldE}`,
            indicators: ['2', '\\'],
          },
        ];
        const fieldBeforeLinking = {
          tag: marcBibFields[2].tag,
          indicator1: marcBibFields[2].indicators[0],
          indicator2: marcBibFields[2].indicators[1],
          content: marcBibFields[2].content,
        };
        const fieldAfterLinking = {
          tag: marcBibFields[2].tag,
          indicator1: marcBibFields[2].indicators[0],
          indicator2: marcBibFields[2].indicators[1],
          controlledAlpha: `$a ${testData.authoritySubfieldA} $t ${testData.authoritySubfieldT} $d ${testData.authoritySubfieldD} $l ${testData.authoritySubfieldL}`,
          notControlledAlpha: `$x ${testData.instanceSubfieldX} $e ${testData.instanceSubfieldE}`,
          controlledNumeric: `$0 ${authData.prefix}${authData.startWithNumber}`,
          notControlledNumeric: '',
        };
        const fieldAfterUnlinking = {
          tag: marcBibFields[2].tag,
          indicator1: marcBibFields[2].indicators[0],
          indicator2: marcBibFields[2].indicators[1],
          content: `$a ${testData.authoritySubfieldA} $t ${testData.authoritySubfieldT} $d ${testData.authoritySubfieldD} $l ${testData.authoritySubfieldL} $x ${testData.instanceSubfieldX} $e ${testData.instanceSubfieldE} $0 ${authData.prefix}${authData.startWithNumber}`,
        };
        const serieStatement = `${testData.authoritySubfieldA} ${testData.authoritySubfieldT} ${testData.authoritySubfieldD} ${testData.authoritySubfieldL} ${testData.instanceSubfieldX} ${testData.instanceSubfieldE}`;

        let user;
        let createdAuthorityId;
        let createdInstanceId;

        before('Create test data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C375085');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ]).then((createdUserProperties) => {
            user = createdUserProperties;

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
            }).then(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
                authRefresh: true,
              });
            });
          });
        });

        after('Delete test data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
          MarcAuthority.deleteViaAPI(createdAuthorityId, true);
          InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        });

        it(
          'C375085 Link the "810" of "MARC Bib" field with "110" field of "MARC Authority" record. (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C375085'] },
          () => {
            InventoryInstances.searchByTitle(createdInstanceId);
            InventoryInstances.selectInstanceById(createdInstanceId);
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();

            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterUnlinkingByTag(...Object.values(fieldBeforeLinking));

            cy.wait(3000); // link icon may not work if clicked too fast
            InventoryInstance.verifyAndClickLinkIcon(testData.tag810);
            InventoryInstance.verifySelectMarcAuthorityModal();

            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResults(authorityHeading);
            MarcAuthorities.checkFieldAndContentExistence(
              testData.tag110,
              authorityFields[0].content,
            );

            MarcAuthorities.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag810);

            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(fieldAfterLinking));

            QuickMarcEditor.pressSaveAndClose();
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();

            InventoryInstance.verifySeriesStatement(
              0,
              `${testData.linkedIconText}${serieStatement}`,
            );
            InventoryInstance.checkExistanceOfAuthorityIconInInstanceDetailPane(
              testData.titleDataAccordionName,
            );

            InventoryInstance.clickViewAuthorityIconDisplayedInInstanceDetailsPane(
              testData.titleDataAccordionName,
            );
            MarcAuthority.waitLoading();
            MarcAuthority.contains(authorityFields[0].content);

            InventoryInstance.goToPreviousPage();
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();
            InventoryInstance.viewSource();
            InventoryViewSource.verifyLinkedToAuthorityIconByTag(testData.tag810);

            InventoryViewSource.checkAuthorityIdForViewAuthorityIconByTag(
              testData.tag810,
              createdAuthorityId,
            );

            InventoryViewSource.close();
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();

            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(fieldAfterLinking));

            cy.wait(3000); // unlink icon may not work if clicked too fast
            QuickMarcEditor.clickUnlinkIconInFieldByTag(testData.tag810);
            QuickMarcEditor.confirmUnlinkingField();
            QuickMarcEditor.verifyTagFieldAfterUnlinkingByTag(
              ...Object.values(fieldAfterUnlinking),
            );
            QuickMarcEditor.verifyIconsAfterUnlinkingByTag(testData.tag810);

            QuickMarcEditor.pressSaveAndClose();
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();

            InventoryInstance.checkAbsenceOfAuthorityIconInInstanceDetailPane(
              testData.titleDataAccordionName,
            );

            InventoryInstance.viewSource();
            InventoryViewSource.checkRowExistsWithTagAndValue(
              testData.tag810,
              fieldAfterUnlinking.content,
            );
            InventoryInstance.checkAbsenceOfAuthorityIconInMarcViewPane();
          },
        );
      });
    });
  });
});
