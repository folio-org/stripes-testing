import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import Affiliations from '../../../../support/dictionary/affiliations';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../../support/fragments/topMenu';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        tag008: '008',
        tag100: '100',
        tag245: '245',
        authorityHeading: `AT_C410882_MarcAuthority_${randomPostfix}`,
        bibTitle: `AT_C410882_MarcBibInstance_${randomPostfix}`,
        user: {},
        heldByAccordionName: 'Held by',
      };

      const authData = {
        prefix: getRandomLetters(15),
        startsWithNumber: 410882,
      };

      const marcBibFields = [
        {
          tag: testData.tag008,
          content: QuickMarcEditor.defaultValid008Values,
        },
        {
          tag: testData.tag100,
          content: `$0 ${authData.prefix}${authData.startsWithNumber}`,
          indicators: ['1', '\\'],
        },
        {
          tag: testData.tag245,
          content: `$a ${testData.bibTitle}`,
          indicators: ['1', '1'],
        },
      ];

      let createdAuthorityIdCentral;
      let createdAuthorityIdMember;
      let createdInstanceId;

      before('Create test data and login', () => {
        cy.resetTenant();
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C410882_MarcAuthority');

        cy.setTenant(Affiliations.College);
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C410882_MarcAuthority');

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          MarcAuthorities.createMarcAuthorityViaAPI(
            authData.prefix,
            `${authData.startsWithNumber + 1}`,
            [
              {
                tag: testData.tag100,
                content: `$a ${testData.authorityHeading} Member`,
                indicators: ['1', '\\'],
              },
            ],
          ).then((createdRecordId) => {
            createdAuthorityIdMember = createdRecordId;
          });

          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
            (instanceId) => {
              createdInstanceId = instanceId;
            },
          );

          cy.resetTenant();
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ]);

          MarcAuthorities.createMarcAuthorityViaAPI(
            authData.prefix,
            `${authData.startsWithNumber}`,
            [
              {
                tag: testData.tag100,
                content: `$a ${testData.authorityHeading} Central`,
                indicators: ['1', '\\'],
              },
            ],
          ).then((createdRecordId) => {
            createdAuthorityIdCentral = createdRecordId;
          });
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(createdAuthorityIdCentral, true);
        cy.setTenant(Affiliations.College);
        InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        MarcAuthority.deleteViaAPI(createdAuthorityIdMember, true);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C410882 "MARC authority" record is opened automatically in "Select MARC authority" plug-in on Member tenant (from Local "MARC bib") (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C410882'] },
        () => {
          cy.setTenant(Affiliations.College);
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });

          InventorySearchAndFilter.clearDefaultFilter(testData.heldByAccordionName);
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon(testData.tag100);
          MarcAuthorities.verifySearchTabIsOpened();
          MarcAuthority.waitLoading();
          MarcAuthority.contains(`${testData.authorityHeading} Central`);

          MarcAuthorities.clickResetAndCheck();

          MarcAuthorities.searchBeats(`${testData.authorityHeading} Member`);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(`${testData.authorityHeading} Member`);

          MarcAuthorities.searchBeats(`${testData.authorityHeading} Central`);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(`${testData.authorityHeading} Central`);
        },
      );
    });
  });
});
