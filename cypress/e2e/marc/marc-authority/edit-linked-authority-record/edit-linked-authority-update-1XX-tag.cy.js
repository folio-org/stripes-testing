import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomFourDigitNumber,
} from '../../../../support/utils/stringTools';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit linked Authority record', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(15);
      const randomDigits = randomFourDigitNumber();
      const testData = {
        authorityHeading: `AT_C374136_MarcAuthority_${randomPostfix} 1967-`,
        authority100FieldContent: `$a AT_C374136_MarcAuthority_${randomPostfix} $d 1967-`,
        instanceTitle: `AT_C374136_MarcBibInstance_${randomPostfix}`,
        tag008: '008',
        tag100: '100',
        tag101: '101',
        tag700: '700',
        tag245: '245',
        newTagValues: ['110', '111', '130', '150', '151', '155', '101'],
        subfieldT: '$t test',
        tag100Index: 4,
        errorText:
          'Fail: Cannot change the saved MARC authority field 100 because it controls a bibliographic field(s). To change this 1XX, you must unlink all controlled bibliographic fields.',
        tSubfieldErrorText:
          'Fail: Cannot add a $t to the 100 field because it controls a bibliographic field(s) that cannot control this subfield. To change this 1XX value, you must unlink all controlled bibliographic fields that cannot control $t.',
      };

      const authData = {
        prefix: randomLetters,
        startWithNumber: `374136${randomDigits}${randomDigits}`,
      };

      const authorityFields = [
        {
          tag: testData.tag100,
          content: testData.authority100FieldContent,
          indicators: ['1', '\\'],
        },
      ];

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
          content: testData.authority100FieldContent,
          indicators: ['1', '\\'],
        },
      ];

      const user = {};
      let createdAuthorityId;
      let createdInstanceId;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C374136_MarcAuthority');

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
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
                bibFieldTags: [testData.tag700],
                authorityFieldTags: [testData.tag100],
                finalBibFieldContents: [testData.authority100FieldContent],
              });
            })
            .then(() => {
              cy.login(user.userProperties.username, user.userProperties.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
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
        'C374136 Edit tag value ("100") in the "MARC Authority" record which controls "MARC Bib(s)" (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C374136'] },
        () => {
          MarcAuthorities.searchBeats(testData.authorityHeading);
          MarcAuthority.waitLoading();
          MarcAuthority.edit();

          let previousTagValue = testData.tag100;
          testData.newTagValues.forEach((newTagValue) => {
            QuickMarcEditor.updateExistingTagName(previousTagValue, newTagValue);
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkErrorMessage(testData.tag100Index, testData.errorText);
            QuickMarcEditor.verifyValidationCallout(0, 1);
            QuickMarcEditor.closeAllCallouts();
            previousTagValue = newTagValue;
          });

          QuickMarcEditor.updateExistingTagName(testData.tag101, testData.tag100);
          QuickMarcEditor.checkButtonsDisabled();

          QuickMarcEditor.updateExistingField(
            testData.tag100,
            `${testData.authority100FieldContent} ${testData.subfieldT}`,
          );
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(testData.tag100Index, testData.tSubfieldErrorText);
          QuickMarcEditor.verifyValidationCallout(0, 1);
        },
      );
    });
  });
});
