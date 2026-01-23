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
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        const testData = {
          tag240: '240',
          tag240content:
            '$a Fail $d PASS (editable) $t test $f fail $g fail $h fail $k fail $l fail $m fail $n fail $o fail $p fail $r fail $s fail $1 pass (editable) $2 pass (editable) $6 pass (editable) $7 pass (editable) $8  pass(editable)',
          browseSearchOption: 'nameTitle',
          searchOption: 'Keyword',
          searchValue: 'Fail PASS (editable) test',
          placeholderMessage: 'Fail PASS (editable) test would be here',
          authorityMarkedValue:
            'Dowland, John, num 1 test purpose 1563?-1626. (valery pilko) pass (read only) pass (read only) epass (read only) pass (read only) pass (read only) pass (read only) pass (read only) pass (read only) pass (read only) pass (read only)',
          tag240rowindex: 28,
          authority100FieldValue:
            'C380763Dowland, John, num 1 test purpose 1563?-1626. (valery pilko) pass (read only) pass (read only) epass (read only) pass (read only) pass (read only) pass (read only) pass (read only) pass (read only) pass (read only) pass (read only)',
          changesSavedCallout:
            'This record has successfully saved and is in process. Changes may not appear immediately.',
        };

        const marcFiles = [
          {
            marc: 'marcBibFileForC380763.mrc',
            fileName: `testMarcFileC380763${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC380763.mrc',
            fileName: `testMarcFileC380763${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
        ];
        const bib240AfterLinkingToAuth100 = [
          28,
          testData.tag240,
          '1',
          '0',
          '$a pass (read only) $f pass (read only) $h pass (read only) $k pass (read only) $l epass (read only) $m pass (read only) $n pass (read only) $o pass (read only) $r pass (read only) $s pass (read only) $p pass (read only) $g pass (read only)',
          '$d PASS (editable)',
          '$0 http://id.loc.gov/authorities/names/n80030866',
          '$1 pass (editable) $2 pass (editable) $6 pass (editable) $7 pass (editable) $8 pass(editable)',
        ];
        const bib110UnlinkedFieldValues = [
          28,
          testData.tag240,
          '1',
          '0',
          '$a pass (read only) $f pass (read only) $h pass (read only) $k pass (read only) $l epass (read only) $m pass (read only) $n pass (read only) $o pass (read only) $r pass (read only) $s pass (read only) $p pass (read only) $g pass (read only) $d PASS (editable) $0 http://id.loc.gov/authorities/names/n80030866 $1 pass (editable) $2 pass (editable) $6 pass (editable) $7 pass (editable) $8 pass(editable)',
        ];

        const createdAuthorityIDs = [];

        before('Creating user', () => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C380763*');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            testData.userProperties = createdUserProperties;

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

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authrefresh: true,
            });
          });
        });

        after('Deleting created user', () => {
          cy.getAdminToken().then(() => {
            Users.deleteViaApi(testData.userProperties.userId);
            InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
            MarcAuthority.deleteViaAPI(createdAuthorityIDs[1]);
          });
        });

        it(
          'C380763 Link "240" field with all subfields (except $0) when MARC authority 100 has all subfields (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C380763'] },
          () => {
            InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
            InventoryInstances.selectInstance();
            cy.wait(1000);
            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickLinkIcon(testData.tag240);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.checkSearchOption(testData.browseSearchOption);
            MarcAuthorities.checkSearchInput(testData.searchValue);
            MarcAuthorities.verifyEmptyAuthorityField();
            MarcAuthorities.checkRow(testData.placeholderMessage);
            MarcAuthorities.switchToSearch();
            MarcAuthorities.checkSearchOption(testData.browseSearchOption);
            MarcAuthorities.checkSearchInput('');
            MarcAuthorities.verifyEmptyAuthorityField();
            MarcAuthorities.searchByParameter(testData.searchOption, testData.authorityMarkedValue);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag240);
            QuickMarcEditor.checkUnlinkTooltipText(28, 'Unlink from MARC Authority record');
            QuickMarcEditor.checkViewMarcAuthorityTooltipText(testData.tag240rowindex);
            QuickMarcEditor.verifyTagFieldAfterLinking(...bib240AfterLinkingToAuth100);
            QuickMarcEditor.pressSaveAndClose();
            cy.wait(1500);
            QuickMarcEditor.checkAfterSaveAndClose();
            cy.wait(2000);
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.clickUnlinkIconInTagField(testData.tag240rowindex);
            QuickMarcEditor.confirmUnlinkingField();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib110UnlinkedFieldValues);
            QuickMarcEditor.checkLinkButtonExist(testData.tag240);
            QuickMarcEditor.pressSaveAndKeepEditing(testData.changesSavedCallout);
            QuickMarcEditor.checkContent(
              bib110UnlinkedFieldValues[4],
              bib110UnlinkedFieldValues[0],
            );
          },
        );
      });
    });
  });
});
