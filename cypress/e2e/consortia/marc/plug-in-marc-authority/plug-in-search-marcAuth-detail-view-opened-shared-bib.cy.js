import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        tag008: '008',
        tag100: '100',
        tag245: '245',
        authorityHeading: `AT_C410884_MarcAuthority_${randomPostfix}`,
        bibTitle: `AT_C410884_MarcBibInstance_${randomPostfix}`,
        user: {},
      };

      const authData = {
        prefix: getRandomLetters(15),
        startsWithNumber: 410884,
      };

      const marcAuthorityFields = [
        {
          tag: testData.tag100,
          content: `$a ${testData.authorityHeading} Member`,
          indicators: ['1', '\\'],
        },
      ];

      const marcBibFields = [
        {
          tag: testData.tag008,
          content: QuickMarcEditor.defaultValid008Values,
        },
        {
          tag: testData.tag100,
          content: `$a ${testData.authorityHeading} $0 ${authData.prefix}${authData.startsWithNumber}`,
          indicators: ['1', '\\'],
        },
        {
          tag: testData.tag245,
          content: `$a ${testData.bibTitle}`,
          indicators: ['1', '1'],
        },
      ];

      let createdAuthorityIdCentral;
      let createdInstanceId;

      before('Create test data and login', () => {
        cy.resetTenant();
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C410884_MarcAuthority');

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          MarcAuthorities.createMarcAuthorityViaAPI(
            authData.prefix,
            `${authData.startsWithNumber}`,
            marcAuthorityFields,
          ).then((createdRecordId) => {
            createdAuthorityIdCentral = createdRecordId;
          });

          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
            (instanceId) => {
              createdInstanceId = instanceId;
            },
          );
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(createdAuthorityIdCentral, true);
        InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C410884 "MARC authority" record is opened automatically in "Select MARC authority" plug-in on Central tenant (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C410884'] },
        () => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });

          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon(testData.tag100);
          MarcAuthorities.verifySearchTabIsOpened();
          MarcAuthority.waitLoading();
          MarcAuthority.contains(testData.authorityHeading);

          MarcAuthorities.clickResetAndCheck();

          MarcAuthorities.searchBeats(testData.authorityHeading);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(testData.authorityHeading);
        },
      );
    });
  });
});
