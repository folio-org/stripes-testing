import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
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
        tag100: '100',
        tag010: '010',
        tag010NewValue: '$a  00000912  $z n 2005070769',
        authority100FieldValue: 'Erbil, H. Yıldırım',
        searchOption: 'Keyword',
        linked100Field: [
          16,
          '100',
          '1',
          '\\',
          '$a Erbil, H. Yıldırım',
          '',
          '$0 http://id.loc.gov/authorities/names/n00000912',
          '',
        ],
        updated100Field: [
          16,
          '100',
          '1',
          '\\',
          '$a Erbil, H. Yıldırım',
          '',
          '$0 http://id.loc.gov/authorities/names/n00000911',
          '',
        ],
        saveCalloutMessage:
          'This record has successfully saved and is in process. 1 linked bibliographic record(s) updates have begun.',
        areYouSureModalMessage:
          '1 bibliographic record is linked to this authority record and will be updated by clicking the Save button.',
      };

      const marcFiles = [
        {
          marc: 'marcBibFileForC376595.mrc',
          fileName: `C376595 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
          instanceTitle: 'Surface chemistry of solid and liquid interfaces / H. Yıldırım Erbil.',
        },
        {
          marc: 'marcAuthFileForC376595.mrc',
          fileName: `C376595 testMarcFileC376595${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          propertyName: 'authority',
          authorityHeading: 'Erbil, H. Yıldırım',
        },
      ];

      const createdRecordIDs = [];

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('Erbil, H. Yıldırım');
        cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
          testData.preconditionUserId = userProperties.userId;

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
            cy.wait(2000);
          });
        });

        cy.waitForAuthRefresh(() => {
          cy.loginAsAdmin({
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          InventoryInstances.waitContentLoading();
        }, 20_000)
          .then(() => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickLinkIcon(testData.tag100);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySearchOptions();
            cy.ifConsortia(true, () => {
              MarcAuthorities.clickAccordionByName('Shared');
              MarcAuthorities.actionsSelectCheckbox('No');
            });
            InventoryInstance.searchResults(marcFiles[1].authorityHeading);
            MarcAuthorities.checkFieldAndContentExistence(
              testData.tag100,
              testData.authority100FieldValue,
            );
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag100);
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked100Field);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
          })
          .then(() => {
            cy.createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
              Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            ]).then((createdUserProperties) => {
              testData.userProperties = createdUserProperties;

              cy.waitForAuthRefresh(() => {
                cy.login(testData.userProperties.username, testData.userProperties.password, {
                  path: TopMenu.marcAuthorities,
                  waiter: MarcAuthorities.waitLoading,
                });
                MarcAuthorities.waitLoading();
              }, 20_000);
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
        MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
        Users.deleteViaApi(testData.userProperties.userId);
        Users.deleteViaApi(testData.preconditionUserId);
      });

      it(
        'C376595 Verify that update of linked MARC authority "010 $a" (prefix deletion) will update linked bib fields "$0" with MARC authority "001" value (because it contains valid prefix) (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C376595'] },
        () => {
          cy.ifConsortia(true, () => {
            MarcAuthorities.clickAccordionByName('Shared');
            MarcAuthorities.actionsSelectCheckbox('No');
          });
          MarcAuthorities.searchAndVerify(testData.searchOption, marcFiles[1].authorityHeading);
          MarcAuthority.edit();
          cy.wait(2000);

          QuickMarcEditor.updateExistingField(testData.tag010, testData.tag010NewValue);
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();
          QuickMarcEditor.verifyAreYouSureModal(testData.areYouSureModalMessage);
          QuickMarcEditor.confirmUpdateLinkedBibs(1);

          MarcAuthorities.closeMarcViewPane();
          MarcAuthorities.checkRowsCount(1);
          MarcAuthorities.verifyNumberOfTitles(5, '1');

          MarcAuthorities.clickOnNumberOfTitlesLink(5, '1');
          InventoryInstance.checkInstanceTitle(marcFiles[0].instanceTitle);

          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyTagFieldAfterLinking(...testData.updated100Field);
        },
      );
    });
  });
});
