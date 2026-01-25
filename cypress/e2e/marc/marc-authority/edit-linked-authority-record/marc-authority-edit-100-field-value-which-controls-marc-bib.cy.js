import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit linked Authority record', () => {
      const testData = {
        tag240: '240',
        tag100: '100',
        updatedValue:
          '$aC374156 Beethoven, Ludwig van,$d1770-1827.$tVariation:,$nop. 44,$rE♭ major$s ver. 5',
        authorityIconText: 'Linked to MARC authority',
        updatedFieldContent: '$a Variation:, $n op. 44, $r E♭ major $s ver. 5',
        updated1XXFieldValue: 'C374156 Beethoven, Ludwig van,',
      };
      const marcFiles = [
        {
          marc: 'marcBibFileC374156.mrc',
          fileName: `testMarcFileC374156${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          instanceTitle: 'Variations / Ludwig Van Beethoven.',
          instanceAlternativeTitle: 'Variation:, op. 44, E♭ major ver. 5',
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileC374156.mrc',
          fileName: `testMarcFileC374156${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          authorityHeading:
            'C374156Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
          updatedAuthorityHeading:
            'C374156 Beethoven, Ludwig van, 1770-1827. Variation:, op. 44, E♭ major ver. 5',
          propertyName: 'authority',
        },
      ];
      const linkingTagAndValue = {
        rowIndex: 17,
        value: 'C374156Beethoven, Ludwig van,',
        tag: '240',
      };
      const createdRecordIDs = [];

      before('Creating user, importing and linking records', () => {
        cy.getAdminToken();
        // make sure there are no duplicate authority records in the system
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C374156*');

        cy.getAdminToken();
        marcFiles.forEach((marcFile) => {
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdRecordIDs.push(record[marcFile.propertyName].id);
            });
          });
        });

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.waitForAuthRefresh(() => {
            cy.loginAsAdmin({
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          }, 20_000).then(() => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickLinkIcon(testData.tag240);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResults(linkingTagAndValue.value);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
              linkingTagAndValue.tag,
              linkingTagAndValue.rowIndex,
            );
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
          });

          cy.waitForAuthRefresh(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          }, 20_000);
        });
      });

      after('Deleting user, data', () => {
        cy.getAdminToken().then(() => {
          Users.deleteViaApi(testData.userProperties.userId);
          createdRecordIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id);
            else InventoryInstance.deleteInstanceViaApi(id);
          });
        });
      });

      it(
        'C374156 Edit "1XX" field value of "MARC Authority" record which controls "MARC Bibs" (spitfire) (TaaS)',
        { tags: ['extendedPathBroken', 'spitfire', 'C374156'] },
        () => {
          MarcAuthorities.searchBy('Keyword', marcFiles[1].authorityHeading);
          MarcAuthorities.selectTitle(marcFiles[1].authorityHeading);
          MarcAuthority.edit();
          cy.wait(2000);
          QuickMarcEditor.updateExistingField(testData.tag100, testData.updatedValue);
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.checkContent(testData.updatedValue, 7);
          QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();
          QuickMarcEditor.cancelUpdateLinkedBibs();
          QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();
          QuickMarcEditor.closeModalWithEscapeKey();
          QuickMarcEditor.checkUpdateLinkedBibModalAbsent();
          QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();
          QuickMarcEditor.confirmUpdateLinkedBibs(1);
          MarcAuthorities.closeMarcViewPane();
          MarcAuthorities.searchBy('Keyword', testData.updated1XXFieldValue);
          MarcAuthorities.checkResultList([marcFiles[1].updatedAuthorityHeading]);
          MarcAuthorities.verifyNumberOfTitles(5, '1');
          MarcAuthorities.clickOnNumberOfTitlesLink(5, '1');
          InventoryInstance.checkInstanceTitle(marcFiles[0].instanceTitle);
          InventoryInstance.verifyAlternativeTitle(
            0,
            1,
            `${testData.authorityIconText}${marcFiles[0].instanceAlternativeTitle}`,
          );
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyTagFieldAfterLinking(
            linkingTagAndValue.rowIndex,
            linkingTagAndValue.tag,
            '1',
            '0',
            '$a Variation:, $n op. 44, $r E♭ major $s ver. 5',
            '',
            '$0 http://id.loc.gov/authorities/names/n83130832',
            '',
          );
        },
      );
    });
  });
});
