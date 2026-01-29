import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const testData = {
        tag700: '700',
        firstTag700Values: [
          75,
          '700',
          '1',
          '\\',
          '$a C366115 Sprouse, Chris $e artist. $0 1357871',
        ],
        secondTag700Values: [
          76,
          '700',
          '1',
          '\\',
          '$a C366115 Martin, Laura $c (Comic book artist) $e colorist. $0 http://id.loc.gov/authorities/names/n2014052262',
        ],
      };
      const marcFiles = [
        {
          marc: 'marcBibFileForC366115.mrc',
          fileName: `C366115 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          numOfRecords: 1,
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileForC366115_1.mrc',
          fileName: `C366115 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          numOfRecords: 1,
          propertyName: 'authority',
        },
        {
          marc: 'marcAuthFileForC366115_2.mrc',
          fileName: `C366115 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          numOfRecords: 1,
          propertyName: 'authority',
        },
      ];
      const linkingTagAndValues = [
        {
          rowIndex: 75,
          value: 'C366115 Sprouse, Chris',
          tag: 700,
        },
        {
          rowIndex: 76,
          value: 'C366115 Martin, Laura (Comic book artist)',
          tag: 700,
        },
      ];
      const createdRecordIDs = [];

      before(() => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.moduleDataImportEnabled.gui])
          .then((createdUserProperties) => {
            testData.preconditionUserId = createdUserProperties.userId;
            // make sure there are no duplicate authority records in the system
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C366115');

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
          })
          .then(() => {
            cy.loginAsAdmin({
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            linkingTagAndValues.forEach((linking) => {
              QuickMarcEditor.clickLinkIconInTagField(linking.rowIndex);
              MarcAuthorities.switchToSearch();
              InventoryInstance.verifySelectMarcAuthorityModal();
              InventoryInstance.verifySearchOptions();
              InventoryInstance.searchResults(linking.value);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyAfterLinkingUsingRowIndex(linking.tag, linking.rowIndex);
            });
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();

            cy.createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
              Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            ]).then((createdUserProperties) => {
              testData.user = createdUserProperties;

              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            });
          });
      });

      after('Deleting created user and data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        Users.deleteViaApi(testData.preconditionUserId);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
        createdRecordIDs.forEach((id, index) => {
          if (index) MarcAuthority.deleteViaAPI(id);
        });
      });

      it(
        'C366115 Derive a new MARC bib record: Unlink "MARC Bibliographic" fields from "MARC Authority" records using "Remove linking" button in "Remove authority linking" modal (spitfire) (TaaS)',
        { tags: ['criticalPath', 'spitfire', 'C366115'] },
        () => {
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.deriveNewMarcBib();
          QuickMarcEditor.verifyRemoveLinkingModal();
          QuickMarcEditor.confirmRemoveAuthorityLinking();
          QuickMarcEditor.checkLinkButtonToolTipTextByIndex(linkingTagAndValues[0].rowIndex);
          QuickMarcEditor.checkLinkButtonToolTipTextByIndex(linkingTagAndValues[1].rowIndex);
          QuickMarcEditor.checkButtonSaveAndCloseEnable();
          QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.firstTag700Values);
          QuickMarcEditor.checkLinkButtonToolTipTextByIndex(linkingTagAndValues[0].rowIndex);
          QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.secondTag700Values);
          QuickMarcEditor.checkLinkButtonToolTipTextByIndex(linkingTagAndValues[1].rowIndex);
          QuickMarcEditor.pressSaveAndClose();
          InventoryInstance.verifyContributor(2, 1, linkingTagAndValues[0].value);
          InventoryInstance.checkMarcAppIconAbsent(2);
          InventoryInstance.verifyContributor(3, 1, linkingTagAndValues[1].value);
          InventoryInstance.checkMarcAppIconAbsent(3);

          InventoryInstance.goToEditMARCBiblRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.verifyIconsAfterUnlinking(75);
          QuickMarcEditor.verifyIconsAfterUnlinking(76);
        },
      );
    });
  });
});
