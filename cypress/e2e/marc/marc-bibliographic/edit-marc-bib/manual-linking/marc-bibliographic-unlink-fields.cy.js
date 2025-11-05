import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import { Permissions } from '../../../../../support/dictionary';
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
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        const testData = {
          tag100: '100',
          tag010: '010',
          tag700: '700',
          authority100FieldValue: 'C365598 Chin, Staceyann, 1972-',
          authority010FieldValue: 'n2008052404',
          authority700FieldValue: 'C365598 Woodson, Jacqueline',
          successMsg:
            'This record has successfully saved and is in process. Changes may not appear immediately.',
          accordion: 'Contributor',
        };
        const marcFiles = [
          {
            marc: 'marcFileForC365598_1.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'marcFileForC365598_2.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'marcFileForC365598_3.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
        ];
        const linkedField = {
          tag: '100',
          secondBox: '1',
          thirdBox: '\\',
          content: '$a C365598 Chin, Staceyann, $d 1972-',
          eSubfield: '$e Author $e Narrator',
          zeroSubfield: '$0 http://id.loc.gov/authorities/names/n2008052404365598',
          seventhBox: '$1 http://viaf.org/viaf/24074052',
        };
        const unlinkedField = {
          tag: '100',
          indicator0: '1',
          indicator1: '\\',
          content:
            '$a C365598 Chin, Staceyann, $d 1972- $e Author $e Narrator $0 http://id.loc.gov/authorities/names/n2008052404365598 $1 http://viaf.org/viaf/24074052',
        };
        const contributors = {
          firstName: 'C365598 Chin, Staceyann, 1972-',
          secondName: 'Woodson, Jacqueline',
        };
        const createdAuthorityIDs = [];

        before(() => {
          cy.getAdminToken();
          // make sure there are no duplicate records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C365598*');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.moduleDataImportEnabled.gui,
          ])
            .then((createdUserProperties) => {
              testData.userProperties = createdUserProperties;

              cy.getUserToken(testData.userProperties.username, testData.userProperties.password);
              marcFiles.forEach((marcFile) => {
                DataImport.uploadFileViaApi(
                  marcFile.marc,
                  marcFile.fileName,
                  marcFile.jobProfileToRun,
                ).then((response) => {
                  response.forEach((record) => {
                    createdAuthorityIDs.push(record[marcFile.propertyName].id);
                  });
                });
              });
            })
            .then(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            });
        });

        after(() => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.userProperties.userId);
          InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[2]);
          createdAuthorityIDs.forEach((id, index) => {
            if (index !== 2) MarcAuthority.deleteViaAPI(id);
          });
        });

        it(
          'C365598 Unlink "MARC Bibliographic" field from "MARC Authority" record and use the "Save & close" button in editing window. (spitfire) (TaaS)',
          { tags: ['criticalPath', 'spitfire', 'C365598'] },
          () => {
            InventoryInstances.searchByTitle(createdAuthorityIDs[2]);
            InventoryInstances.selectInstance();
            // unstable without this waiter
            cy.wait(1000);
            InventoryInstance.editMarcBibliographicRecord();

            InventoryInstance.verifyAndClickLinkIcon(testData.tag100);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResults(testData.authority100FieldValue);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag100);
            InventoryInstance.verifyAndClickLinkIcon(testData.tag700);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResults(testData.authority700FieldValue);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag700);
            QuickMarcEditor.clickSaveAndKeepEditingButton();
            QuickMarcEditor.checkCallout(testData.successMsg);
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(
              linkedField.tag,
              linkedField.secondBox,
              linkedField.thirdBox,
              linkedField.content,
              linkedField.eSubfield,
              linkedField.zeroSubfield,
              linkedField.seventhBox,
            );
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtonsinFieldByTag(linkedField.tag);
            QuickMarcEditor.checkUnlinkTooltipTextInFieldByTag(
              linkedField.tag,
              'Unlink from MARC Authority record',
            );
            QuickMarcEditor.clickUnlinkIconInFieldByTag(linkedField.tag);
            QuickMarcEditor.checkUnlinkModal(testData.tag100);
            QuickMarcEditor.confirmUnlinkingField();
            QuickMarcEditor.verifyTagFieldAfterUnlinkingByTag(
              unlinkedField.tag,
              unlinkedField.indicator0,
              unlinkedField.indicator1,
              unlinkedField.content,
            );
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.verifyContributor(0, 1, contributors.firstName);
            InventoryInstance.checkMarcAppIconAbsent(0);
            InventoryInstance.verifyContributorWithMarcAppLink(1, 1, contributors.secondName);
            InventoryInstance.checkMarcAppIconExist(1);
          },
        );
      });
    });
  });
});
