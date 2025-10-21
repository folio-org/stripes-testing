import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import { MARC_AUTHORITY_SEARCH_OPTIONS } from '../../../../support/constants';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Search', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = randomFourDigitNumber();
      const testData = {
        tag008: '008',
        tag100: '100',
        tag150: '150',
        tag245: '245',
        authorityTitlePrefix: `AT_C422186_MarcAuthority_${randomPostfix}`,
        bibTitle: `AT_C422186_MarcBibInstance_${randomPostfix}`,
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.CHILDRENS_SUBJECT_HEADING,
        sourceFilePrefix: 'sj',
        naturalIdBase: `422186${randomDigits}${randomDigits}`,
        // required so that authority could be found with "Children's subject heading" search option
        authority008Values: { ...MarcAuthorities.valid008FieldValues, 'SH Sys': 'b' },
      };

      const searchData = [
        { query: `${testData.sourceFilePrefix}${testData.naturalIdBase}04`, recordIndex: 0 },
        { query: `${testData.sourceFilePrefix}${testData.naturalIdBase}11`, recordIndex: 1 },
        { query: `${testData.sourceFilePrefix}${testData.naturalIdBase}64`, recordIndex: 2 },
        { query: `${testData.sourceFilePrefix}  ${testData.naturalIdBase}04`, recordIndex: 0 },
        { query: `${testData.sourceFilePrefix}  ${testData.naturalIdBase}64`, recordIndex: 2 },
      ];

      const marcBibFields = [
        {
          tag: testData.tag008,
          content: QuickMarcEditor.defaultValid008Values,
        },
        {
          tag: testData.tag100,
          content: `$a ${testData.authorityTitlePrefix}`,
          indicators: ['1', '\\'],
        },
        {
          tag: testData.tag245,
          content: `$a ${testData.bibTitle}`,
          indicators: ['1', '1'],
        },
      ];

      const createdAuthorityIds = [];
      let createdBibId;

      before('Creating user', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C422186_MarcAuthority');

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.then(() => {
            MarcAuthorities.createMarcAuthorityViaAPI(
              testData.sourceFilePrefix,
              `  ${testData.naturalIdBase}04`,
              [
                {
                  tag: testData.tag100,
                  content: `$a ${testData.authorityTitlePrefix} 0`,
                  indicators: ['1', '\\'],
                },
              ],
              undefined,
              testData.authority008Values,
            ).then((createdRecordId) => {
              createdAuthorityIds.push(createdRecordId);
            });

            MarcAuthorities.createMarcAuthorityViaAPI(
              testData.sourceFilePrefix,
              `${testData.naturalIdBase}11`,
              [
                {
                  tag: testData.tag150,
                  content: `$a ${testData.authorityTitlePrefix} 1`,
                  indicators: ['1', '\\'],
                },
              ],
              undefined,
              testData.authority008Values,
            ).then((createdRecordId) => {
              createdAuthorityIds.push(createdRecordId);
            });

            MarcAuthorities.createMarcAuthorityViaAPI(
              testData.sourceFilePrefix,
              `  ${testData.naturalIdBase}64`,
              [
                {
                  tag: testData.tag150,
                  content: `$a ${testData.authorityTitlePrefix} 2`,
                  indicators: ['1', '\\'],
                },
              ],
              undefined,
              testData.authority008Values,
            ).then((createdRecordId) => {
              createdAuthorityIds.push(createdRecordId);
            });

            cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
              (instanceId) => {
                createdBibId = instanceId;
              },
            );
          }).then(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          });
        });
      });

      after('Deleting created user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdBibId);
        createdAuthorityIds.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
      });

      it(
        'C422186 MARC Authority plug-in | Support search for "naturalId" field using "Children\'s subject heading" search option (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C422186'] },
        () => {
          InventoryInstances.searchByTitle(createdBibId);
          InventoryInstances.selectInstanceById(createdBibId);
          InventoryInstance.waitLoading();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon(testData.tag100);
          MarcAuthorities.switchToSearch();
          MarcAuthorities.verifySearchTabIsOpened();
          MarcAuthorities.selectSearchOptionInDropdown(testData.searchOption);
          MarcAuthorities.checkSelectOptionFieldContent(testData.searchOption);

          searchData.forEach((search) => {
            MarcAuthorities.searchBeats(search.query);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(`${testData.authorityTitlePrefix} ${search.recordIndex}`);
          });
        },
      );
    });
  });
});
